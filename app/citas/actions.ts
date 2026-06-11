"use server";

import { revalidatePath } from "next/cache";
import { clienteCreadoMarker } from "./constants";
import { prisma } from "@/app/lib/prisma";

function requiredCitaId(formData: FormData) {
  const id = Number(formData.get("citaId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cita no valida.");
  }

  return id;
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

export async function deleteCita(formData: FormData) {
  const id = requiredCitaId(formData);

  await prisma.cita.delete({
    where: { id },
  });

  revalidatePath("/citas");
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
}
