"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import {
  categoriasMaterial,
  prefijoCategoriaMaterial,
  unidadesMaterial,
} from "@/app/materiales/constants";

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

function requiredMaterialId(formData: FormData) {
  const id = optionalString(formData, "materialId");
  if (!id) {
    throw new Error("Material no valido.");
  }

  return id;
}

function categoriaValue(formData: FormData) {
  const value = optionalString(formData, "categoria") ?? "Otros";
  if (!categoriasMaterial.includes(value as (typeof categoriasMaterial)[number])) {
    throw new Error("Categoria de material no valida.");
  }

  return value;
}

function unidadBaseValue(formData: FormData) {
  const value = optionalString(formData, "unidadBase");
  if (!value) {
    return null;
  }

  if (!unidadesMaterial.includes(value as (typeof unidadesMaterial)[number])) {
    throw new Error("Unidad base no valida.");
  }

  return value;
}

function materialData(formData: FormData) {
  return {
    nombre: requiredString(formData, "nombre"),
    categoria: categoriaValue(formData),
    unidadBase: unidadBaseValue(formData),
    descripcion: optionalString(formData, "descripcion"),
  };
}

async function nextMaterialCode(categoria: string) {
  const prefix = prefijoCategoriaMaterial(categoria);
  const lastMaterial = await prisma.material.findFirst({
    where: { codigo: { startsWith: `${prefix}-` } },
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const lastNumber = Number(lastMaterial?.codigo.match(/-(\d+)$/)?.[1] ?? 0);

  return `${prefix}-${String(lastNumber + 1).padStart(6, "0")}`;
}

export async function createMaterial(formData: FormData) {
  const data = materialData(formData);
  const returnToGastoId = optionalString(formData, "returnToGastoId");
  const returnToLineaId = optionalString(formData, "returnToLineaId");
  const codigo = await nextMaterialCode(data.categoria);

  const material = await prisma.material.create({
    data: {
      ...data,
      codigo,
    },
  });

  if (returnToGastoId && returnToLineaId) {
    await prisma.gastoLinea.updateMany({
      where: { id: returnToLineaId, gastoId: returnToGastoId },
      data: {
        materialId: material.id,
        codigoMaterialDetectado: material.codigo,
      },
    });
    revalidatePath(`/gastos/${returnToGastoId}`);
    revalidatePath(`/gastos/${returnToGastoId}/editar`);
  }

  revalidatePath("/materiales");
  revalidatePath("/gastos");

  if (returnToGastoId) {
    redirect(`/gastos/${returnToGastoId}/editar`);
  }

  redirect(`/materiales/${material.id}`);
}

export async function updateMaterial(formData: FormData) {
  const id = requiredMaterialId(formData);

  await prisma.material.update({
    where: { id },
    data: materialData(formData),
  });

  revalidatePath("/materiales");
  revalidatePath(`/materiales/${id}`);
  redirect(`/materiales/${id}`);
}
