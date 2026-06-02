"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarActividadCliente } from "@/app/lib/actividad";
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
    select: {
      clienteId: true,
      numero: true,
    },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  await prisma.presupuesto.delete({
    where: { id: presupuestoId },
  });
  await registrarActividadCliente({
    clienteId: presupuesto.clienteId,
    tipo: "PRESUPUESTO_ELIMINADO",
    descripcion: `Presupuesto nº ${presupuesto.numero} eliminado`,
  });

  revalidatePath(`/clientes/${presupuesto.clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos");

  redirect(safeReturnTo(formData, `/clientes/${presupuesto.clienteId}`));
}

export async function ensurePresupuestoPublicToken(presupuestoId: number) {
  if (!Number.isInteger(presupuestoId) || presupuestoId < 1) {
    throw new Error("Presupuesto no valido.");
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: {
      clienteId: true,
      publicToken: true,
    },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  if (presupuesto.publicToken) {
    return presupuesto.publicToken;
  }

  const token = randomUUID();
  const updated = await prisma.presupuesto.updateMany({
    where: {
      id: presupuestoId,
      publicToken: null,
    },
    data: {
      publicToken: token,
      publicTokenCreatedAt: new Date(),
    },
  });

  if (updated.count === 1) {
    revalidatePath(`/clientes/${presupuesto.clienteId}`);
    revalidatePath("/presupuestos");
    return token;
  }

  const refreshed = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { publicToken: true },
  });

  if (!refreshed?.publicToken) {
    throw new Error("No se ha podido generar el enlace publico.");
  }

  return refreshed.publicToken;
}
