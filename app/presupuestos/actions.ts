"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

function requiredId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Presupuesto no valido.");
  }

  return id;
}

function safeReturnTo(formData: FormData, fallback: string) {
  const value = formData.get("returnTo");
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  const url = new URL(value, "http://localhost");
  if (url.origin !== "http://localhost") {
    return fallback;
  }

  url.searchParams.set("presupuestoEliminado", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function deletePresupuesto(formData: FormData) {
  const presupuestoId = requiredId(formData, "presupuestoId");

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { clienteId: true },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  await prisma.presupuesto.delete({
    where: { id: presupuestoId },
  });

  revalidatePath(`/clientes/${presupuesto.clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos");

  redirect(safeReturnTo(formData, `/clientes/${presupuesto.clienteId}`));
}
