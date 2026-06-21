"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FrecuenciaVencimiento } from "@/app/generated/prisma/client";
import { requireAuthenticatedUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  categoriasVencimiento,
  frecuenciasVencimiento,
} from "@/app/vencimientos/constants";
import {
  generateVencimientosHasta,
  recurrenceHorizon,
} from "@/app/vencimientos/recurrence";

export type VencimientoActionState = { message: string };

const initialState: VencimientoActionState = { message: "" };

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  return textValue(formData, key) || null;
}

function dateValue(formData: FormData, key: string, required = true) {
  const value = textValue(formData, key);
  if (!value && !required) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es válida.`);
  }
  return date;
}

function decimalValue(formData: FormData, key: string) {
  const raw = textValue(formData, key).replace(/\s/g, "").replace(",", ".");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("El importe debe ser un número igual o mayor que cero.");
  }
  return value.toFixed(2);
}

function integerValue(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  optional = false,
) {
  const raw = textValue(formData, key);
  if (!raw && optional) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} debe estar entre ${min} y ${max}.`);
  }
  return value;
}

function titularId(formData: FormData) {
  return integerValue(formData, "titularGastoId", 1, 2_147_483_647, true);
}

function baseValues(formData: FormData) {
  const titulo = textValue(formData, "titulo");
  const categoria = textValue(formData, "categoria");
  if (!titulo) throw new Error("El título es obligatorio.");
  if (!categoriasVencimiento.includes(categoria as (typeof categoriasVencimiento)[number])) {
    throw new Error("Selecciona una categoría válida.");
  }

  return {
    titulo,
    descripcion: optionalText(formData, "descripcion"),
    categoria,
    proveedor: optionalText(formData, "proveedor"),
    titularGastoId: titularId(formData),
  };
}

function recurrenteValues(formData: FormData) {
  const frecuencia = textValue(formData, "frecuencia") as FrecuenciaVencimiento;
  if (!frecuenciasVencimiento.includes(frecuencia)) {
    throw new Error("Selecciona una frecuencia válida.");
  }
  const fechaInicio = dateValue(formData, "fechaInicio")!;
  const fechaFin = dateValue(formData, "fechaFin", false);
  if (fechaFin && fechaFin < fechaInicio) {
    throw new Error("La fecha fin no puede ser anterior a la fecha de inicio.");
  }

  return {
    ...baseValues(formData),
    importeEstimado: decimalValue(formData, "importeEstimado"),
    frecuencia,
    intervalo: integerValue(formData, "intervalo", 1, 100)!,
    diaMes: frecuencia === "SEMANAL"
      ? null
      : integerValue(formData, "diaMes", 1, 31, true) ?? fechaInicio.getUTCDate(),
    mesAplicable: textValue(formData, "mesAplicable")
      ? integerValue(formData, "mesAplicable", 1, 12, true)
      : null,
    fechaInicio,
    fechaFin,
    activo: formData.get("activo") === "on",
  };
}

function refreshVencimientos() {
  revalidatePath("/");
  revalidatePath("/gastos");
  revalidatePath("/vencimientos");
  revalidatePath("/vencimientos/recurrentes");
}

export async function createRecurrente(
  _state: VencimientoActionState = initialState,
  formData: FormData,
): Promise<VencimientoActionState> {
  void _state;
  await requireAuthenticatedUser();
  let id: string;
  try {
    const record = await prisma.vencimientoRecurrente.create({
      data: recurrenteValues(formData),
    });
    id = record.id;
    if (record.activo) {
      await generateVencimientosHasta(recurrenceHorizon(), [record.id]);
    }
  } catch (error) {
    return { message: error instanceof Error ? error.message : "No se pudo crear." };
  }
  refreshVencimientos();
  redirect(`/vencimientos/recurrentes?creado=${id}`);
}

export async function updateRecurrente(
  _state: VencimientoActionState = initialState,
  formData: FormData,
): Promise<VencimientoActionState> {
  void _state;
  await requireAuthenticatedUser();
  const id = textValue(formData, "id");
  if (!id) return { message: "Falta el identificador." };
  try {
    const values = recurrenteValues(formData);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.$transaction(async (tx) => {
      await tx.vencimiento.deleteMany({
        where: {
          recurrenteId: id,
          estado: "PENDIENTE",
          fechaVencimiento: { gte: today },
        },
      });
      await tx.vencimientoRecurrente.update({
        where: { id },
        data: { ...values, ultimoGeneradoHasta: null },
      });
    });
    if (values.activo) {
      await generateVencimientosHasta(recurrenceHorizon(), [id]);
    }
  } catch (error) {
    return { message: error instanceof Error ? error.message : "No se pudo actualizar." };
  }
  refreshVencimientos();
  redirect("/vencimientos/recurrentes?actualizado=1");
}

export async function toggleRecurrente(formData: FormData) {
  await requireAuthenticatedUser();
  const id = textValue(formData, "id");
  const activo = textValue(formData, "activo") === "true";
  await prisma.vencimientoRecurrente.update({ where: { id }, data: { activo } });
  if (activo) await generateVencimientosHasta(recurrenceHorizon(), [id]);
  refreshVencimientos();
}

export async function deleteRecurrente(formData: FormData) {
  await requireAuthenticatedUser();
  const id = textValue(formData, "id");
  await prisma.$transaction(async (tx) => {
    const history = await tx.vencimiento.count({ where: { recurrenteId: id } });
    if (history > 0) {
      await tx.vencimientoRecurrente.update({ where: { id }, data: { activo: false } });
      return;
    }
    await tx.vencimientoRecurrente.delete({ where: { id } });
  });
  refreshVencimientos();
}

export async function createVencimientoManual(
  _state: VencimientoActionState = initialState,
  formData: FormData,
): Promise<VencimientoActionState> {
  void _state;
  await requireAuthenticatedUser();
  try {
    await prisma.vencimiento.create({
      data: {
        ...baseValues(formData),
        importe: decimalValue(formData, "importe"),
        fechaVencimiento: dateValue(formData, "fechaVencimiento")!,
        origen: "MANUAL",
      },
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : "No se pudo crear." };
  }
  refreshVencimientos();
  redirect("/vencimientos?creado=1");
}

export async function updateEstadoVencimiento(formData: FormData) {
  await requireAuthenticatedUser();
  const id = textValue(formData, "id");
  const estado = textValue(formData, "estado");
  if (estado !== "PENDIENTE" && estado !== "PAGADO" && estado !== "CANCELADO") {
    throw new Error("Estado no válido.");
  }
  await prisma.vencimiento.update({
    where: { id },
    data: {
      estado,
      fechaPago: estado === "PAGADO" ? new Date() : null,
    },
  });
  refreshVencimientos();
}

export async function deleteVencimientoManual(formData: FormData) {
  await requireAuthenticatedUser();
  const id = textValue(formData, "id");
  await prisma.vencimiento.deleteMany({
    where: { id, origen: "MANUAL", estado: { not: "PAGADO" } },
  });
  refreshVencimientos();
}
