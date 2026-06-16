"use server";

import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { uploadsRootDir } from "@/app/lib/uploads";

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

const tiposDocumento = [
  "Catalogo",
  "Tarifa",
  "Ficha tecnica",
  "Condiciones comerciales",
  "Otro",
] as const;

const maxDocumentSize = 20 * 1024 * 1024;
const allowedDocumentExtensions = ["pdf", "xlsx", "docx"] as const;
const allowedDocumentTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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

function requiredDocumentoId(formData: FormData) {
  const id = Number(formData.get("documentoId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Documento no valido.");
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

function tipoDocumentoValue(formData: FormData) {
  const value = optionalString(formData, "tipo") ?? "Otro";
  if (!tiposDocumento.includes(value as (typeof tiposDocumento)[number])) {
    throw new Error("Tipo de documento no valido.");
  }

  return value;
}

function proveedorData(formData: FormData) {
  return {
    nombre: requiredString(formData, "nombre"),
    codigoInterno: optionalString(formData, "codigoInterno"),
    telefono: optionalString(formData, "telefono"),
    email: optionalString(formData, "email"),
    web: optionalString(formData, "web"),
    categoria: categoriaValue(formData),
    contacto: optionalString(formData, "contacto"),
    direccion: optionalString(formData, "direccion"),
    observaciones: optionalString(formData, "observaciones"),
  };
}

function proveedorUploadsDir(proveedorId: number) {
  return path.join(uploadsRootDir(), "proveedores", String(proveedorId));
}

function proveedorUploadUrl(proveedorId: number, fileName: string) {
  return `/api/uploads/proveedores/${proveedorId}/${fileName}`;
}

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "documento";
}

function requiredDocumentFile(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un documento.");
  }

  if (file.size > maxDocumentSize) {
    throw new Error("El documento no puede superar 20 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    !extension ||
    !allowedDocumentExtensions.includes(
      extension as (typeof allowedDocumentExtensions)[number],
    )
  ) {
    throw new Error("Solo se aceptan documentos PDF, XLSX o DOCX.");
  }

  if (file.type && !allowedDocumentTypes.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido.");
  }

  return { file, extension };
}

function uploadFilePathFromUrl(url: string, proveedorId: number) {
  const prefix = `/api/uploads/proveedores/${proveedorId}/`;
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

async function registrarActividadProveedor(
  proveedorId: number,
  descripcion: string,
) {
  await prisma.actividadProveedor.create({
    data: {
      proveedorId,
      descripcion,
    },
  });
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

export async function uploadDocumentoProveedor(formData: FormData) {
  const proveedorId = requiredId(formData);
  const tipo = tipoDocumentoValue(formData);
  const nombre = optionalString(formData, "nombre");
  const descripcion = optionalString(formData, "descripcion");
  const { file, extension } = requiredDocumentFile(formData);

  const proveedor = await prisma.proveedor.findUnique({
    where: { id: proveedorId },
    select: { id: true },
  });
  if (!proveedor) {
    throw new Error("Proveedor no encontrado.");
  }

  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
    file.name,
  )}.${extension}`;
  const uploadDir = proveedorUploadsDir(proveedorId);
  const filePath = path.join(uploadDir, fileName);
  const archivoUrl = proveedorUploadUrl(proveedorId, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const savedFile = await stat(filePath);
  if (!savedFile.isFile() || savedFile.size === 0) {
    throw new Error("El documento no se ha guardado correctamente.");
  }

  const documento = await prisma.documentoProveedor.create({
    data: {
      proveedorId,
      nombre: nombre ?? file.name,
      tipo,
      archivoUrl,
      descripcion,
      tamanoBytes: savedFile.size,
    },
  });

  await registrarActividadProveedor(
    proveedorId,
    `Documento añadido: ${documento.nombre}`,
  );

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${proveedorId}`);
}

export async function deleteDocumentoProveedor(formData: FormData) {
  const proveedorId = requiredId(formData);
  const documentoId = requiredDocumentoId(formData);

  const documento = await prisma.documentoProveedor.findFirst({
    where: {
      id: documentoId,
      proveedorId,
    },
  });
  if (!documento) {
    throw new Error("Documento no encontrado.");
  }

  const filePath = uploadFilePathFromUrl(documento.archivoUrl, proveedorId);
  if (filePath) {
    await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }

  await prisma.documentoProveedor.delete({
    where: { id: documento.id },
  });
  await registrarActividadProveedor(
    proveedorId,
    `Documento eliminado: ${documento.nombre}`,
  );

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${proveedorId}`);
}
