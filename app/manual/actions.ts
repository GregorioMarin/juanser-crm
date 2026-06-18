"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

const nivelesManual = ["BASICO", "AVANZADO", "TALLER"] as const;

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
    throw new Error("Articulo no valido.");
  }

  return id;
}

function optionalInteger(formData: FormData, key: string) {
  const raw = optionalString(formData, key);
  if (!raw) {
    return 0;
  }

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`El campo ${key} debe ser un numero entero.`);
  }

  return value;
}

function nivelValue(formData: FormData) {
  const value = optionalString(formData, "nivel") ?? "BASICO";
  if (!nivelesManual.includes(value as (typeof nivelesManual)[number])) {
    throw new Error("Nivel de manual no valido.");
  }

  return value as (typeof nivelesManual)[number];
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "articulo";
}

async function nextSlug(title: string, currentId?: number) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.manualArticulo.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === currentId) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function manualData(formData: FormData, currentId?: number) {
  const titulo = requiredString(formData, "titulo");

  return {
    titulo,
    slug: await nextSlug(titulo, currentId),
    categoria: requiredString(formData, "categoria"),
    etiquetas: optionalString(formData, "etiquetas"),
    nivel: nivelValue(formData),
    resumen: optionalString(formData, "resumen"),
    contenido: requiredString(formData, "contenido"),
    usoComercial: optionalString(formData, "usoComercial"),
    notaInterna: optionalString(formData, "notaInterna"),
    orden: optionalInteger(formData, "orden"),
    activo: formData.get("activo") === "on",
  };
}

export async function createManualArticulo(formData: FormData) {
  const articulo = await prisma.manualArticulo.create({
    data: await manualData(formData),
    select: { slug: true },
  });

  revalidatePath("/manual");
  redirect(`/manual/${articulo.slug}`);
}

export async function updateManualArticulo(formData: FormData) {
  const id = requiredId(formData);
  const articulo = await prisma.manualArticulo.update({
    where: { id },
    data: await manualData(formData, id),
    select: { slug: true },
  });

  revalidatePath("/manual");
  revalidatePath(`/manual/${articulo.slug}`);
  redirect(`/manual/${articulo.slug}`);
}

export async function deleteManualArticulo(formData: FormData) {
  const id = requiredId(formData);
  await prisma.manualArticulo.delete({ where: { id } });

  revalidatePath("/manual");
  redirect("/manual");
}
