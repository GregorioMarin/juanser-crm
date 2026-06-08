"use server";

import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

const estadosCobro = ["PENDIENTE", "PARCIAL", "COBRADA"] as const;
const maxFacturaVentaPdfSize = Number(process.env.FACTURA_VENTA_MAX_PDF_SIZE ?? 20 * 1024 * 1024);

type EstadoCobro = (typeof estadosCobro)[number];

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

function requiredId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`${key} no valido.`);
  }

  return id;
}

function optionalId(formData: FormData, key: string) {
  const raw = optionalString(formData, key);
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`${key} no valido.`);
  }

  return id;
}

function parseDecimal(value: string, key: string) {
  const normalized = value.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`El campo ${key} debe ser un importe valido.`);
  }

  return Number(normalized).toFixed(2);
}

function requiredDecimal(formData: FormData, key: string) {
  return parseDecimal(requiredString(formData, key), key);
}

function requiredDate(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function estadoCobroValue(formData: FormData) {
  const value = optionalString(formData, "estadoCobro") ?? "PENDIENTE";
  if (!estadosCobro.includes(value as EstadoCobro)) {
    throw new Error("Estado de cobro no valido.");
  }

  return value as EstadoCobro;
}

function safeReturnTo(formData: FormData, fallback: string) {
  const value = optionalString(formData, "returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  const url = new URL(value, "http://localhost");
  if (url.origin !== "http://localhost") {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function uploadsRootDir() {
  return path.resolve(process.cwd(), "uploads");
}

function facturaUploadsDir(uploadId: string) {
  return path.join(uploadsRootDir(), "facturas-venta", uploadId);
}

function facturaUploadUrl(uploadId: string, fileName: string) {
  return `/api/uploads/facturas-venta/${uploadId}/${fileName}`;
}

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "factura-venta";
}

function optionalPdfFile(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > maxFacturaVentaPdfSize) {
    throw new Error(
      `El PDF no puede superar ${Math.round(maxFacturaVentaPdfSize / 1024 / 1024)} MB.`,
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const validMimeType = !file.type || file.type === "application/pdf";
  if (extension !== "pdf" || !validMimeType) {
    throw new Error("Solo se aceptan archivos PDF.");
  }

  return file;
}

function requiredPdfFile(formData: FormData) {
  const file = optionalPdfFile(formData);
  if (!file) {
    throw new Error("Selecciona el PDF de la factura.");
  }

  return file;
}

async function saveFacturaFile(file: File) {
  const uploadId = randomUUID();
  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(file.name)}.pdf`;
  const uploadDir = facturaUploadsDir(uploadId);
  const filePath = path.join(uploadDir, fileName);
  const archivoUrl = facturaUploadUrl(uploadId, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  const savedFile = await stat(filePath);
  if (!savedFile.isFile() || savedFile.size === 0) {
    throw new Error("El PDF no se ha guardado correctamente.");
  }

  return archivoUrl;
}

function uploadFilePathFromUrl(url: string) {
  const prefix = "/api/uploads/facturas-venta/";
  if (!url.startsWith(prefix) || url.includes("\\") || url.includes("..")) {
    return null;
  }

  const relativePath = url.replace(/^\/api\/uploads\//, "");
  const rootDir = uploadsRootDir();
  const filePath = path.resolve(rootDir, relativePath);
  const relativeToRoot = path.relative(rootDir, filePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return filePath;
}

async function assertFacturaRelations(clienteId: number, presupuestoId: number | null) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  if (presupuestoId) {
    const presupuesto = await prisma.presupuesto.findFirst({
      where: { id: presupuestoId, clienteId },
      select: { id: true },
    });
    if (!presupuesto) {
      throw new Error("El presupuesto no pertenece a este cliente.");
    }
  }
}

function facturaData(formData: FormData, archivoUrl: string) {
  const clienteId = requiredId(formData, "clienteId");
  const presupuestoId = optionalId(formData, "presupuestoId");

  return {
    clienteId,
    presupuestoId,
    numeroFactura: requiredString(formData, "numeroFactura"),
    fechaFactura: requiredDate(formData, "fechaFactura"),
    baseImponible: requiredDecimal(formData, "baseImponible"),
    iva: requiredDecimal(formData, "iva"),
    total: requiredDecimal(formData, "total"),
    estadoCobro: estadoCobroValue(formData),
    notas: optionalString(formData, "notas"),
    archivoUrl,
  };
}

export async function createFacturaVenta(formData: FormData) {
  const archivoUrl = await saveFacturaFile(requiredPdfFile(formData));
  const data = facturaData(formData, archivoUrl);
  await assertFacturaRelations(data.clienteId, data.presupuestoId);

  const factura = await prisma.facturaVenta.create({ data });

  revalidatePath("/");
  revalidatePath("/facturas-venta");
  revalidatePath("/presupuestos");
  revalidatePath(`/clientes/${factura.clienteId}`);
  if (factura.presupuestoId) {
    revalidatePath(`/presupuestos/${factura.presupuestoId}`);
  }

  redirect(safeReturnTo(formData, "/facturas-venta"));
}

export async function updateFacturaVenta(formData: FormData) {
  const facturaId = requiredId(formData, "facturaId");
  const existing = await prisma.facturaVenta.findUnique({
    where: { id: facturaId },
    select: { id: true, clienteId: true, presupuestoId: true, archivoUrl: true },
  });
  if (!existing) {
    throw new Error("Factura no encontrada.");
  }

  const newFile = optionalPdfFile(formData);
  const archivoUrl = newFile ? await saveFacturaFile(newFile) : existing.archivoUrl;
  const data = facturaData(formData, archivoUrl);
  await assertFacturaRelations(data.clienteId, data.presupuestoId);

  await prisma.facturaVenta.update({
    where: { id: facturaId },
    data,
  });

  if (newFile) {
    const oldPath = uploadFilePathFromUrl(existing.archivoUrl);
    if (oldPath) {
      await unlink(oldPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/facturas-venta");
  revalidatePath("/presupuestos");
  revalidatePath(`/clientes/${existing.clienteId}`);
  revalidatePath(`/clientes/${data.clienteId}`);
  if (existing.presupuestoId) {
    revalidatePath(`/presupuestos/${existing.presupuestoId}`);
  }
  if (data.presupuestoId) {
    revalidatePath(`/presupuestos/${data.presupuestoId}`);
  }

  redirect(safeReturnTo(formData, "/facturas-venta"));
}

export async function vincularFacturaVenta(formData: FormData) {
  const facturaId = requiredId(formData, "facturaId");
  const presupuestoId = requiredId(formData, "presupuestoId");
  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { id: true, clienteId: true },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  const factura = await prisma.facturaVenta.findFirst({
    where: { id: facturaId, clienteId: presupuesto.clienteId },
    select: { id: true },
  });
  if (!factura) {
    throw new Error("La factura no pertenece al cliente del presupuesto.");
  }

  await prisma.facturaVenta.update({
    where: { id: facturaId },
    data: { presupuestoId },
  });

  revalidatePath("/facturas-venta");
  revalidatePath("/presupuestos");
  revalidatePath(`/clientes/${presupuesto.clienteId}`);
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

export async function deleteFacturaVenta(formData: FormData) {
  const facturaId = requiredId(formData, "facturaId");
  const factura = await prisma.facturaVenta.findUnique({
    where: { id: facturaId },
    select: { id: true, clienteId: true, presupuestoId: true, archivoUrl: true },
  });
  if (!factura) {
    throw new Error("Factura no encontrada.");
  }

  await prisma.facturaVenta.delete({ where: { id: facturaId } });

  const filePath = uploadFilePathFromUrl(factura.archivoUrl);
  if (filePath) {
    await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/facturas-venta");
  revalidatePath("/presupuestos");
  revalidatePath(`/clientes/${factura.clienteId}`);
  if (factura.presupuestoId) {
    revalidatePath(`/presupuestos/${factura.presupuestoId}`);
  }

  redirect(safeReturnTo(formData, "/facturas-venta"));
}
