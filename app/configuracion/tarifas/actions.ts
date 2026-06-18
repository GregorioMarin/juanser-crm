"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`El campo ${key} es obligatorio.`);
  }

  return value;
}

function requiredId(formData: FormData) {
  const id = Number(optionalString(formData, "id"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Tarifa no valida.");
  }

  return id;
}

function requiredPrice(formData: FormData) {
  const raw = requiredString(formData, "precio").replace(",", ".");
  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("El precio debe ser un numero mayor o igual que 0.");
  }

  return price.toFixed(2);
}

function tarifaData(formData: FormData) {
  return {
    categoria: requiredString(formData, "categoria"),
    nombre: requiredString(formData, "nombre"),
    unidad: requiredString(formData, "unidad"),
    precio: requiredPrice(formData),
    activo: formData.get("activo") === "on",
  };
}

export async function createTarifaInterna(formData: FormData) {
  await prisma.tarifaInterna.create({
    data: tarifaData(formData),
  });

  revalidatePath("/configuracion/tarifas");
  revalidatePath("/calculadoras/armarios");
}

export async function updateTarifaInterna(formData: FormData) {
  await prisma.tarifaInterna.update({
    where: { id: requiredId(formData) },
    data: tarifaData(formData),
  });

  revalidatePath("/configuracion/tarifas");
  revalidatePath("/calculadoras/armarios");
}

export async function toggleTarifaInterna(formData: FormData) {
  const id = requiredId(formData);
  const active = formData.get("activo") === "true";

  await prisma.tarifaInterna.update({
    where: { id },
    data: { activo: active },
  });

  revalidatePath("/configuracion/tarifas");
  revalidatePath("/calculadoras/armarios");
}

export async function deleteTarifaInterna(formData: FormData) {
  await prisma.tarifaInterna.delete({
    where: { id: requiredId(formData) },
  });

  revalidatePath("/configuracion/tarifas");
  revalidatePath("/calculadoras/armarios");
}
