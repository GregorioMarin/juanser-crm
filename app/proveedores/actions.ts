"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

const categoriasProveedor = [
  "Tableros",
  "Herrajes",
  "Puertas",
  "Cristales",
  "Lacados",
  "Barnices",
  "Encimeras",
  "Otros",
] as const;

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
  const id = Number(formData.get("proveedorId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Proveedor no valido.");
  }

  return id;
}

function categoriaValue(formData: FormData) {
  const value = optionalString(formData, "categoria") ?? "Otros";
  if (!categoriasProveedor.includes(value as (typeof categoriasProveedor)[number])) {
    throw new Error("Categoria de proveedor no valida.");
  }

  return value;
}

function proveedorData(formData: FormData) {
  return {
    nombre: requiredString(formData, "nombre"),
    telefono: optionalString(formData, "telefono"),
    email: optionalString(formData, "email"),
    web: optionalString(formData, "web"),
    categoria: categoriaValue(formData),
    contacto: optionalString(formData, "contacto"),
    direccion: optionalString(formData, "direccion"),
    observaciones: optionalString(formData, "observaciones"),
  };
}

export async function createProveedor(formData: FormData) {
  await prisma.proveedor.create({
    data: proveedorData(formData),
  });

  revalidatePath("/proveedores");
}

export async function updateProveedor(formData: FormData) {
  const id = requiredId(formData);

  await prisma.proveedor.update({
    where: { id },
    data: proveedorData(formData),
  });

  revalidatePath("/proveedores");
}

export async function deleteProveedor(formData: FormData) {
  const id = requiredId(formData);

  await prisma.proveedor.delete({
    where: { id },
  });

  revalidatePath("/proveedores");
}
