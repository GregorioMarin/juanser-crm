"use server";

import { rm } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

function requiredClienteId(formData: FormData) {
  const id = Number(formData.get("clienteId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cliente no valido.");
  }

  return id;
}

function uploadsRootDir() {
  return path.resolve(process.cwd(), "uploads");
}

function clienteUploadsDir(clienteId: number) {
  const rootDir = uploadsRootDir();
  const uploadDir = path.resolve(rootDir, "clientes", String(clienteId));
  const relativeToRoot = path.relative(rootDir, uploadDir);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error("Ruta de uploads de cliente no valida.");
  }

  return uploadDir;
}

async function deleteClienteUploads(clienteId: number) {
  const uploadDir = clienteUploadsDir(clienteId);

  await rm(uploadDir, { recursive: true, force: true }).catch((error) => {
    console.error("Error al borrar archivos fisicos del cliente", {
      clienteId,
      uploadDir,
      error,
    });
  });
}

export async function deleteCliente(formData: FormData) {
  const clienteId = requiredClienteId(formData);
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      presupuestos: {
        select: { id: true },
      },
    },
  });

  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const presupuestoIds = cliente.presupuestos.map((presupuesto) => presupuesto.id);

  await prisma.$transaction([
    prisma.presupuestoLinea.deleteMany({
      where: { presupuestoId: { in: presupuestoIds } },
    }),
    prisma.presupuesto.deleteMany({
      where: { clienteId },
    }),
    prisma.seguimiento.deleteMany({
      where: { clienteId },
    }),
    prisma.actividadCliente.deleteMany({
      where: { clienteId },
    }),
    prisma.fotoCliente.deleteMany({
      where: { clienteId },
    }),
    prisma.cliente.delete({
      where: { id: clienteId },
    }),
  ]);

  await deleteClienteUploads(clienteId);

  revalidatePath("/clientes");
  revalidatePath("/clientes/perdidos");
  revalidatePath("/");
  revalidatePath("/kanban");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/presupuestos");

  redirect("/clientes?clienteEliminado=1");
}
