"use server";

import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

const maxImageSize = 10 * 1024 * 1024;
const maxVideoSize = 50 * 1024 * 1024;
const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"] as const;
const allowedVideoExtensions = ["mp4", "mov", "webm"] as const;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];
const mediaCategorias = ["ANTES", "DESPUES", "VIDEO"] as const;

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

function requiredId(formData: FormData, key = "trabajoId") {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Trabajo no valido.");
  }

  return id;
}

function optionalDecimal(formData: FormData, key: string) {
  const raw = optionalString(formData, key);
  if (!raw) {
    return "0";
  }

  const normalized = raw.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`El campo ${key} debe ser un importe valido.`);
  }

  return value.toFixed(2);
}

function requiredDate(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`El campo ${key} debe ser una fecha valida.`);
  }

  return date;
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function trabajoData(formData: FormData) {
  return {
    titulo: requiredString(formData, "titulo"),
    clienteNombre: optionalString(formData, "clienteNombre"),
    localidad: requiredString(formData, "localidad"),
    tipoTrabajo: requiredString(formData, "tipoTrabajo"),
    descripcion: requiredString(formData, "descripcion"),
    importe: optionalDecimal(formData, "importe"),
    fechaTrabajo: requiredDate(formData, "fechaTrabajo"),
    destacadoWeb: booleanValue(formData, "destacadoWeb"),
  };
}

function mediaCategoriaValue(formData: FormData) {
  const value = optionalString(formData, "categoria") ?? "DESPUES";
  if (!mediaCategorias.includes(value as (typeof mediaCategorias)[number])) {
    throw new Error("Categoria multimedia no valida.");
  }

  return value as (typeof mediaCategorias)[number];
}

function uploadsRootDir() {
  return path.resolve(process.cwd(), "uploads");
}

function trabajoUploadsDir(trabajoId: number) {
  return path.join(uploadsRootDir(), "trabajos", String(trabajoId));
}

function trabajoUploadUrl(trabajoId: number, fileName: string) {
  return `/api/uploads/trabajos/${trabajoId}/${fileName}`;
}

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "trabajo";
}

function requiredMediaFile(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un archivo.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const isImage =
    Boolean(extension && allowedImageExtensions.includes(
      extension as (typeof allowedImageExtensions)[number],
    )) && allowedImageTypes.includes(file.type);
  const isVideo =
    Boolean(extension && allowedVideoExtensions.includes(
      extension as (typeof allowedVideoExtensions)[number],
    )) && allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error("Solo se aceptan imagenes jpg, jpeg, png, webp o videos mp4, mov, webm.");
  }

  if (isImage && file.size > maxImageSize) {
    throw new Error("La imagen no puede superar 10 MB.");
  }

  if (isVideo && file.size > maxVideoSize) {
    throw new Error("El video no puede superar 50 MB.");
  }

  return {
    file,
    extension: extension as string,
    tipoArchivo: isVideo ? ("VIDEO" as const) : ("IMAGEN" as const),
  };
}

function uploadFilePathFromUrl(url: string, trabajoId: number) {
  const prefix = `/api/uploads/trabajos/${trabajoId}/`;
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

export async function createTrabajo(formData: FormData) {
  const trabajo = await prisma.trabajoTerminado.create({
    data: trabajoData(formData),
  });

  revalidatePath("/");
  revalidatePath("/trabajos");
  redirect(`/trabajos/${trabajo.id}`);
}

export async function updateTrabajo(formData: FormData) {
  const id = requiredId(formData);

  await prisma.trabajoTerminado.update({
    where: { id },
    data: trabajoData(formData),
  });

  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${id}`);
}

export async function deleteTrabajo(formData: FormData) {
  const id = requiredId(formData);
  const trabajo = await prisma.trabajoTerminado.findUnique({
    where: { id },
    select: {
      media: {
        select: { url: true },
      },
    },
  });

  if (!trabajo) {
    throw new Error("Trabajo no encontrado.");
  }

  await Promise.all(
    trabajo.media.map(async (media) => {
      const filePath = uploadFilePathFromUrl(media.url, id);
      if (!filePath) {
        return;
      }

      await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }),
  );

  await prisma.trabajoTerminado.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${id}`);
  redirect("/trabajos");
}

export async function uploadTrabajoMedia(formData: FormData) {
  const trabajoId = requiredId(formData);
  const categoria = mediaCategoriaValue(formData);
  const descripcion = optionalString(formData, "descripcion");
  const { file, extension, tipoArchivo } = requiredMediaFile(formData);

  if (categoria === "VIDEO" && tipoArchivo !== "VIDEO") {
    throw new Error("La seccion Videos solo acepta archivos de video.");
  }

  if (categoria !== "VIDEO" && tipoArchivo !== "IMAGEN") {
    throw new Error("Las secciones de fotos solo aceptan imagenes.");
  }

  const trabajo = await prisma.trabajoTerminado.findUnique({
    where: { id: trabajoId },
    select: { id: true },
  });
  if (!trabajo) {
    throw new Error("Trabajo no encontrado.");
  }

  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
    file.name,
  )}.${extension}`;
  const uploadDir = trabajoUploadsDir(trabajoId);
  const filePath = path.join(uploadDir, fileName);
  const url = trabajoUploadUrl(trabajoId, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  const savedFile = await stat(filePath);
  if (!savedFile.isFile() || savedFile.size === 0) {
    throw new Error("El archivo no se ha guardado correctamente.");
  }

  await prisma.trabajoTerminadoMedia.create({
    data: {
      trabajoId,
      tipoArchivo,
      categoria,
      url,
      nombreArchivo: file.name,
      descripcion,
      mimeType: file.type,
      tamanoBytes: savedFile.size,
    },
  });

  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);
}

export async function deleteTrabajoMedia(formData: FormData) {
  const trabajoId = requiredId(formData);
  const mediaId = requiredId(formData, "mediaId");

  const media = await prisma.trabajoTerminadoMedia.findFirst({
    where: {
      id: mediaId,
      trabajoId,
    },
  });
  if (!media) {
    throw new Error("Archivo no encontrado.");
  }

  const filePath = uploadFilePathFromUrl(media.url, trabajoId);
  if (filePath) {
    await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }

  await prisma.trabajoTerminadoMedia.delete({
    where: { id: media.id },
  });

  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);
}
