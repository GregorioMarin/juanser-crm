"use server";

import { revalidatePath } from "next/cache";
import { clienteCreadoMarker } from "./constants";
import {
  buildCitaNota,
  citaEstados,
  type CitaEstadoNormalizado,
} from "./helpers";
import { prisma } from "@/app/lib/prisma";

export type CitaActionState = {
  ok: boolean;
  message: string;
};

function requiredCitaId(formData: FormData) {
  const id = Number(formData.get("citaId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cita no valida.");
  }

  return id;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`${label} es obligatorio.`);
  }

  return value;
}

function requiredDateTime(formData: FormData, key: string, label: string) {
  const value = requiredString(formData, key, label);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} no es valida.`);
  }

  return date;
}

function requiredEstado(formData: FormData) {
  const value = requiredString(formData, "estado", "El estado");
  if (!citaEstados.includes(value as CitaEstadoNormalizado)) {
    throw new Error("Estado de cita no valido.");
  }

  return value as CitaEstadoNormalizado;
}

function hasClienteCreadoMarker(nota: string | null) {
  return (
    nota
      ?.split("\n")
      .map((line) => line.trim())
      .includes(clienteCreadoMarker) ?? false
  );
}

function appendClienteCreadoMarker(nota: string | null) {
  if (hasClienteCreadoMarker(nota)) {
    return nota;
  }

  return [nota, clienteCreadoMarker].filter(Boolean).join("\n");
}

function citaPreservedLines(nota: string | null) {
  return hasClienteCreadoMarker(nota) ? [clienteCreadoMarker] : [];
}

export async function deleteCita(formData: FormData) {
  const id = requiredCitaId(formData);

  await prisma.cita.delete({
    where: { id },
  });

  revalidatePath("/citas");
  revalidatePath("/clientes");
  revalidatePath("/");
}

export async function updateCita(
  _prevState: CitaActionState,
  formData: FormData,
): Promise<CitaActionState> {
  let id: number;
  let clienteNombre: string;
  let fechaHora: Date;
  let estado: CitaEstadoNormalizado;

  try {
    id = requiredCitaId(formData);
    clienteNombre = requiredString(formData, "clienteNombre", "El nombre");
    fechaHora = requiredDateTime(formData, "fechaHora", "La fecha");
    estado = requiredEstado(formData);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Datos de cita no validos.",
    };
  }

  const existing = await prisma.cita.findUnique({
    where: { id },
    select: { nota: true },
  });

  if (!existing) {
    return {
      ok: false,
      message: "Cita no encontrada.",
    };
  }

  await prisma.cita.update({
    where: { id },
    data: {
      clienteNombre,
      telefono: optionalString(formData, "telefono"),
      email: optionalString(formData, "email"),
      fechaHora,
      estado,
      nota: buildCitaNota({
        servicio: optionalString(formData, "servicio"),
        nota: optionalString(formData, "nota"),
        preservedLines: citaPreservedLines(existing.nota),
      }),
    },
  });

  revalidatePath("/citas");
  revalidatePath("/clientes");
  revalidatePath("/");

  return {
    ok: true,
    message: "Cita guardada correctamente.",
  };
}

export async function convertirCitaEnCliente(formData: FormData) {
  const id = requiredCitaId(formData);
  const cita = await prisma.cita.findUnique({
    where: { id },
  });

  if (!cita) {
    throw new Error("Cita no encontrada.");
  }

  if (hasClienteCreadoMarker(cita.nota)) {
    revalidatePath("/citas");
    revalidatePath("/clientes");
    revalidatePath("/");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const update = await tx.cita.updateMany({
      where: {
        id,
        OR: [
          { nota: null },
          { NOT: { nota: { contains: clienteCreadoMarker } } },
        ],
      },
      data: {
        nota: appendClienteCreadoMarker(cita.nota),
      },
    });

    if (update.count === 0) {
      return;
    }

    const cliente = await tx.cliente.create({
      data: {
        nombre: cita.clienteNombre,
        telefono: cita.telefono,
        email: cita.email,
        origenContacto: cita.origen === "AMELIA" ? "Formulario web" : "Otro",
        observaciones: cita.nota,
      },
    });

    await tx.actividadCliente.create({
      data: {
        clienteId: cliente.id,
        tipo: "CLIENTE_CREADO",
        descripcion: "Cliente creado desde cita",
      },
    });
  });

  revalidatePath("/citas");
  revalidatePath("/clientes");
  revalidatePath("/");
}
