import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import type { ReactNode } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import {
  EmailContactAction,
  PhoneContactActions,
} from "@/app/contact-actions";
import {
  ClienteEstadoFields,
} from "@/app/clientes/cliente-estado-fields";
import { DeleteClienteForm } from "@/app/clientes/delete-cliente-form";
import { LocalidadField } from "@/app/clientes/localidad-field";
import { localidades } from "@/app/clientes/localidades";
import { motivosRechazo } from "@/app/clientes/motivos-rechazo";
import { DeletePagoCuentaForm } from "@/app/clientes/[id]/delete-pago-cuenta-form";
import {
  MultimediaUploadForm,
  type MultimediaUploadState,
} from "@/app/clientes/multimedia-upload-form";
import { createFacturaVenta } from "@/app/facturas-venta/actions";
import { DeleteFacturaVentaForm } from "@/app/facturas-venta/delete-factura-venta-form";
import { FacturaVentaForm } from "@/app/facturas-venta/factura-venta-form";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import {
  defaultPresupuestoObservaciones,
  defaultPresupuestoValidezDias,
} from "@/app/presupuestos/default-observaciones";
import { DeletePresupuestoForm } from "@/app/presupuestos/delete-presupuesto-form";
import { WhatsAppPresupuestoLink } from "@/app/presupuestos/whatsapp-presupuesto-link";

export const runtime = "nodejs";

const estadoStyles: Record<string, string> = {
  "Nuevo lead": "bg-sky-100 text-sky-900 ring-sky-200",
  Visitado: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  "Presupuesto enviado": "bg-amber-100 text-amber-950 ring-amber-200",
  "Pendiente respuesta": "bg-orange-100 text-orange-950 ring-orange-200",
  Aceptado: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  "En fabricación": "bg-violet-100 text-violet-900 ring-violet-200",
  Instalado: "bg-teal-100 text-teal-900 ring-teal-200",
  Perdido: "bg-rose-100 text-rose-900 ring-rose-200",
};

const estados = [
  "Nuevo lead",
  "Visitado",
  "Presupuesto enviado",
  "Pendiente respuesta",
  "Aceptado",
  "En fabricación",
  "Instalado",
  "Perdido",
] as const;
const estadoPerdido = "Perdido";

const origenesContacto = [
  "WhatsApp",
  "Teléfono",
  "Email",
  "Formulario web",
  "Visita presencial",
  "Otro",
] as const;

const tiposCliente = [
  "Usuario final",
  "Arquitecto",
  "Constructora",
  "Tienda",
  "Otros",
] as const;

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";
const maxImageSize = 10 * 1024 * 1024;
const maxVideoSize = 50 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];
const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];
const allowedVideoExtensions = ["mp4", "mov", "webm"];
const fotoTipos = ["CLIENTE", "JUANSER"] as const;
const presupuestoEstados = ["PENDIENTE", "ACEPTADO", "RECHAZADO", "INSTALADO"] as const;
const metodosPago = ["Transferencia", "Efectivo", "Tarjeta", "Bizum", "Otro"] as const;
const estadosTrabajoTerminadoDestacado = [
  "Aceptado",
  "En fabricación",
  "Instalado",
] as const;

type FotoTipo = (typeof fotoTipos)[number];
type PresupuestoEstado = (typeof presupuestoEstados)[number];
type MetodoPago = (typeof metodosPago)[number];

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
    throw new Error("Cliente no valido.");
  }

  return id;
}

function requiredFotoTipo(formData: FormData) {
  const value = optionalString(formData, "tipo");
  if (!fotoTipos.includes(value as FotoTipo)) {
    throw new Error("Tipo de archivo no valido.");
  }

  return value as FotoTipo;
}

function requiredPresupuestoEstado(formData: FormData) {
  const value = optionalString(formData, "estado") ?? "PENDIENTE";
  if (!presupuestoEstados.includes(value as PresupuestoEstado)) {
    throw new Error("Estado de presupuesto no valido.");
  }

  return value as PresupuestoEstado;
}

function requiredMetodoPago(formData: FormData) {
  const value = optionalString(formData, "metodoPago");
  if (!metodosPago.includes(value as MetodoPago)) {
    throw new Error("Metodo de pago no valido.");
  }

  return value as MetodoPago;
}

function optionalPresupuestoId(formData: FormData) {
  const raw = optionalString(formData, "presupuestoId");
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Presupuesto no valido.");
  }

  return id;
}

function estadoValue(formData: FormData) {
  const value = optionalString(formData, "estado") ?? "Nuevo lead";
  const estado = estados.find((estadoOption) => {
    return estadoOption.toLocaleLowerCase() === value.toLocaleLowerCase();
  });

  if (!estado) {
    throw new Error("Estado no valido.");
  }

  return estado;
}

function origenContactoValue(formData: FormData) {
  const value = optionalString(formData, "origenContacto") ?? "WhatsApp";
  if (!origenesContacto.includes(value as (typeof origenesContacto)[number])) {
    throw new Error("Origen del contacto no valido.");
  }

  return value;
}

function tipoClienteValue(formData: FormData) {
  const value = optionalString(formData, "tipoCliente") ?? "Usuario final";
  if (!tiposCliente.includes(value as (typeof tiposCliente)[number])) {
    throw new Error("Tipo de cliente no valido.");
  }

  return value;
}

function motivoRechazoValue(formData: FormData, estado: string) {
  if (estado !== estadoPerdido) {
    return null;
  }

  const value = optionalString(formData, "motivoRechazo") ?? motivosRechazo[0];

  if (!motivosRechazo.includes(value as (typeof motivosRechazo)[number])) {
    throw new Error("Motivo de rechazo no valido.");
  }

  return value;
}

function localidadValue(formData: FormData) {
  const selected =
    optionalString(formData, "localidadSeleccionada") ?? localidades[0];
  if (!localidades.includes(selected as (typeof localidades)[number])) {
    throw new Error("Localidad no valida.");
  }

  if (selected === "Otro") {
    return requiredString(formData, "localidadOtro");
  }

  return selected;
}

function requiredDecimal(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  return parseDecimal(value, key);
}

function parseDecimal(value: string, key: string) {
  const normalized = value.replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`El campo ${key} debe ser un importe valido.`);
  }

  return normalized;
}

function optionalInteger(formData: FormData, key: string, fallback: number) {
  const value = optionalString(formData, key);
  if (!value) {
    return fallback;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`El campo ${key} no es valido.`);
  }

  return numberValue;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function requiredDate(formData: FormData, key: string) {
  const date = optionalDate(formData, key);
  if (!date) {
    throw new Error(`La fecha ${key} es obligatoria.`);
  }

  return date;
}

function optionalCurrency(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  return value ? parseDecimal(value, key) : null;
}

function clienteEditableData(formData: FormData) {
  const estado = estadoValue(formData);

  return {
    nombre: requiredString(formData, "nombre"),
    telefono: optionalString(formData, "telefono"),
    email: optionalString(formData, "email"),
    direccion: optionalString(formData, "direccion"),
    localidad: localidadValue(formData),
    origenContacto: origenContactoValue(formData),
    tipoCliente: tipoClienteValue(formData),
    presupuesto: optionalCurrency(formData, "presupuesto"),
    importeAceptado: optionalCurrency(formData, "importeAceptado"),
    fechaAlta: requiredDate(formData, "fechaAlta"),
    fechaSeguimiento: optionalDate(formData, "fechaSeguimiento"),
    fechaMedicion: optionalDate(formData, "fechaMedicion"),
    fechaInstalacion: optionalDate(formData, "fechaInstalacion"),
    estado,
    motivoRechazo: motivoRechazoValue(formData, estado),
    observaciones: optionalString(formData, "observaciones"),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const presupuestoNumeroPrefix = "PJ";
const presupuestoNumeroPadding = 4;
const presupuestoNumeroLockKey = 2026060801;

function incrementPresupuestoNumero(numero: string | null, fecha: Date) {
  const prefix = `${presupuestoNumeroPrefix}-${fecha.getFullYear()}-`;
  if (!numero) {
    return `${prefix}${"1".padStart(presupuestoNumeroPadding, "0")}`;
  }

  const match = numero.match(/(\d+)$/);
  if (!match) {
    return `${prefix}${"1".padStart(presupuestoNumeroPadding, "0")}`;
  }

  const [suffix] = match;
  const nextNumber = Number(suffix) + 1;
  const padding = Math.max(presupuestoNumeroPadding, suffix.length);

  return `${prefix}${String(nextNumber).padStart(padding, "0")}`;
}

async function generatePresupuestoNumero(
  fecha: Date,
  tx: Pick<typeof prisma, "presupuesto"> = prisma,
) {
  const lastPresupuesto = await tx.presupuesto.findFirst({
    orderBy: { id: "desc" },
    select: {
      numero: true,
    },
  });

  return incrementPresupuestoNumero(lastPresupuesto?.numero ?? null, fecha);
}

type PresupuestoLineaData = {
  concepto: string;
  descripcion: string | null;
  cantidad: string;
  precioUnitario: string;
  total: string;
};

function presupuestoLineasData(formData: FormData) {
  const lineas = Array.from({ length: 6 }, (_, index) => {
    const concepto = optionalString(formData, `lineas[${index}][concepto]`);
    const cantidadRaw = optionalString(formData, `lineas[${index}][cantidad]`);
    const precioRaw = optionalString(formData, `lineas[${index}][precioUnitario]`);
    const descripcion = optionalString(formData, `lineas[${index}][descripcion]`);

    if (!concepto && !cantidadRaw && !precioRaw && !descripcion) {
      return null;
    }

    if (!concepto || !cantidadRaw || !precioRaw) {
      throw new Error("Cada linea debe tener concepto, cantidad y precio.");
    }

    const cantidad = parseDecimal(cantidadRaw, "cantidad");
    const precioUnitario = parseDecimal(precioRaw, "precioUnitario");
    const total = roundCurrency(Number(cantidad) * Number(precioUnitario));

    return {
      concepto,
      descripcion,
      cantidad,
      precioUnitario,
      total: total.toFixed(2),
    };
  }).filter((linea): linea is PresupuestoLineaData => linea !== null);

  if (lineas.length === 0) {
    throw new Error("Añade al menos una linea de presupuesto.");
  }

  return lineas;
}

function requiredMediaFile(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un archivo.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const isImage =
    Boolean(extension && allowedImageExtensions.includes(extension)) &&
    allowedImageTypes.includes(file.type);
  const isVideo =
    Boolean(extension && allowedVideoExtensions.includes(extension)) &&
    allowedVideoTypes.includes(file.type);
  const tipoArchivoDetectado: "IMAGEN" | "VIDEO" | null = isVideo
    ? "VIDEO"
    : isImage
      ? "IMAGEN"
      : null;

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
    tipoArchivo: tipoArchivoDetectado,
  };
}

function uploadFolder(tipo: FotoTipo) {
  return tipo === "CLIENTE" ? "cliente" : "juanser";
}

function uploadsRootDir() {
  return path.resolve(process.cwd(), "uploads");
}

function persistentUploadsDir(clienteId: number, tipo: FotoTipo) {
  return path.join(
    uploadsRootDir(),
    "clientes",
    String(clienteId),
    uploadFolder(tipo),
  );
}

function apiUploadUrl(clienteId: number, tipo: FotoTipo, fileName: string) {
  return `/api/uploads/clientes/${clienteId}/${uploadFolder(tipo)}/${fileName}`;
}

function hasSystemPathShape(url: string) {
  return (
    /^[a-zA-Z]:[\\/]/.test(url) ||
    url.startsWith("\\\\") ||
    url.startsWith("file:") ||
    /^https?:\/\//i.test(url) ||
    url.includes("\\")
  );
}

function validPublicUploadUrl(url: string | null | undefined, clienteId?: number) {
  if (!url) {
    return false;
  }

  const expectedPrefix = clienteId
    ? `/api/uploads/clientes/${clienteId}/`
    : "/api/uploads/clientes/";

  return url.startsWith(expectedPrefix) && !hasSystemPathShape(url);
}

function renderablePublicUploadUrl(
  url: string | null | undefined,
  clienteId: number,
) {
  if (!url) {
    return false;
  }

  if (validPublicUploadUrl(url, clienteId)) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const expectedPrefix = `/api/uploads/clientes/${clienteId}/`;

    return (
      (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") &&
      parsedUrl.pathname.startsWith(expectedPrefix) &&
      !parsedUrl.pathname.includes("\\")
    );
  } catch {
    return false;
  }
}

function validatePublicUploadUrl(url: string, clienteId: number) {
  if (!validPublicUploadUrl(url, clienteId)) {
    throw new Error("URL publica de imagen no valida.");
  }
}

function assertPublicUploadUrl(url: string, clienteId: number) {
  const expectedPrefix = `/api/uploads/clientes/${clienteId}/`;
  if (!url.startsWith(expectedPrefix)) {
    throw new Error("La URL publica generada no apunta a uploads de clientes.");
  }

  validatePublicUploadUrl(url, clienteId);
}

function uploadFilePathFromUrl(url: string, clienteId: number) {
  if (!validPublicUploadUrl(url, clienteId)) {
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

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safe || "imagen";
}

async function addSeguimiento(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const nota = requiredString(formData, "nota");

  await prisma.seguimiento.create({
    data: {
      clienteId,
      nota,
    },
  });
  await registrarActividadCliente({
    clienteId,
    tipo: "SEGUIMIENTO_CREADO",
    descripcion: "Seguimiento añadido",
  });

  revalidatePath(`/clientes/${clienteId}`);
}

async function createPresupuesto(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const lineas = presupuestoLineasData(formData);
  const presupuestoEstado = requiredPresupuestoEstado(formData);
  const ivaPorcentaje = Number(requiredDecimal(formData, "ivaPorcentaje"));
  const totalSinIva = roundCurrency(
    lineas.reduce((sum, linea) => sum + Number(linea.total), 0),
  );
  const totalIva = roundCurrency((totalSinIva * ivaPorcentaje) / 100);
  const totalConIva = roundCurrency(totalSinIva + totalIva);
  const fecha = optionalDate(formData, "fecha") ?? new Date();
  let presupuesto;
  try {
    presupuesto = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${presupuestoNumeroLockKey})`;
      const numero = await generatePresupuestoNumero(fecha, tx);

      return tx.presupuesto.create({
        data: {
          clienteId,
          numero,
          titulo: requiredString(formData, "titulo"),
          descripcion: requiredString(formData, "descripcion"),
          importe: totalConIva.toFixed(2),
          estado: presupuestoEstado,
          fecha,
          validezDias: optionalInteger(
            formData,
            "validezDias",
            defaultPresupuestoValidezDias,
          ),
          observaciones: optionalString(formData, "observaciones"),
          ivaPorcentaje: ivaPorcentaje.toFixed(2),
          totalSinIva: totalSinIva.toFixed(2),
          totalIva: totalIva.toFixed(2),
          totalConIva: totalConIva.toFixed(2),
          lineas: {
            create: lineas,
          },
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "No se pudo crear el presupuesto porque el número generado ya existe. Inténtalo de nuevo.",
      );
    }

    throw error;
  }
  await registrarActividadCliente({
    clienteId,
    tipo: "PRESUPUESTO_CREADO",
    descripcion: `Presupuesto nº ${presupuesto.numero} creado por importe ${formatCurrency(
      presupuesto.totalConIva,
    )}`,
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos");
}

async function createPagoCuenta(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const presupuestoId = optionalPresupuestoId(formData);

  if (presupuestoId) {
    const presupuesto = await prisma.presupuesto.findFirst({
      where: {
        id: presupuestoId,
        clienteId,
      },
      select: { id: true },
    });
    if (!presupuesto) {
      throw new Error("El presupuesto no pertenece a este cliente.");
    }
  }

  const pago = await prisma.pagoCuenta.create({
    data: {
      clienteId,
      presupuestoId,
      concepto: requiredString(formData, "concepto"),
      importe: requiredDecimal(formData, "importe"),
      fechaPago: requiredDate(formData, "fechaPago"),
      metodoPago: requiredMetodoPago(formData),
      referencia: optionalString(formData, "referencia"),
      observaciones: optionalString(formData, "observaciones"),
    },
  });

  await registrarActividadCliente({
    clienteId,
    tipo: "PAGO_CUENTA_REGISTRADO",
    descripcion: `Pago a cuenta registrado por importe ${formatCurrency(pago.importe)}`,
  });

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/presupuestos");
}

async function deletePagoCuenta(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const pagoId = requiredId(formData, "pagoId");
  const pago = await prisma.pagoCuenta.findFirst({
    where: {
      id: pagoId,
      clienteId,
    },
    select: {
      id: true,
      importe: true,
      concepto: true,
    },
  });

  if (!pago) {
    throw new Error("Pago a cuenta no encontrado.");
  }

  await prisma.pagoCuenta.delete({
    where: { id: pago.id },
  });

  await registrarActividadCliente({
    clienteId,
    tipo: "PAGO_CUENTA_ELIMINADO",
    descripcion: `Pago a cuenta eliminado: ${pago.concepto} (${formatCurrency(
      pago.importe,
    )})`,
  });

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/presupuestos");
}

async function uploadFotoCliente(
  _state: MultimediaUploadState,
  formData: FormData,
): Promise<MultimediaUploadState> {
  "use server";

  try {
    const clienteId = requiredId(formData, "clienteId");
    const tipo = requiredFotoTipo(formData);
    const descripcion = optionalString(formData, "descripcion");
    const { file, extension, tipoArchivo } = requiredMediaFile(formData);

    if (!tipoArchivo) {
      throw new Error("No se ha podido detectar el tipo de archivo.");
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!cliente) {
      throw new Error("Cliente no encontrado.");
    }

    const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
      file.name,
    )}.${extension}`;
    const relativeUrl = apiUploadUrl(clienteId, tipo, fileName);
    const uploadDir = persistentUploadsDir(clienteId, tipo);
    const filePath = path.join(uploadDir, fileName);

    assertPublicUploadUrl(relativeUrl, clienteId);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    const savedFile = await stat(filePath);
    if (!savedFile.isFile() || savedFile.size === 0) {
      throw new Error("El archivo no se ha guardado correctamente.");
    }

    const foto = await prisma.fotoCliente.create({
      data: {
        clienteId,
        tipo,
        url: relativeUrl,
        nombreArchivo: file.name,
        descripcion,
        mimeType: file.type,
        tamanoBytes: savedFile.size,
        tipoArchivo,
      },
    });
    if (foto.tipoArchivo !== tipoArchivo) {
      throw new Error("El tipo de archivo no se ha guardado correctamente.");
    }

    const fotoEnFicha = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        fotos: {
          where: { id: foto.id },
          select: {
            id: true,
            url: true,
            tipoArchivo: true,
            tamanoBytes: true,
          },
        },
      },
    });
    const archivoVisibleEnConsulta = fotoEnFicha?.fotos[0];
    if (!archivoVisibleEnConsulta) {
      throw new Error("El archivo se ha guardado, pero no aparece en la consulta de la ficha.");
    }

    if (
      archivoVisibleEnConsulta.url !== relativeUrl ||
      archivoVisibleEnConsulta.tipoArchivo !== tipoArchivo
    ) {
      throw new Error("El registro creado no coincide con el archivo subido.");
    }

    await registrarActividadCliente({
      clienteId,
      tipo:
        tipo === "CLIENTE" ? "IMAGEN_CLIENTE_SUBIDA" : "IMAGEN_JUANSER_SUBIDA",
      descripcion:
        tipoArchivo === "VIDEO"
          ? tipo === "CLIENTE"
            ? "Vídeo aportado por el cliente subido"
            : "Vídeo/propuesta de Juanser subido"
          : tipo === "CLIENTE"
            ? "Imagen aportada por el cliente subida"
            : "Imagen/propuesta de Juanser subida",
    });

    revalidatePath(`/clientes/${clienteId}`);

    return {
      status: "success",
      message:
        tipoArchivo === "VIDEO"
          ? "Vídeo subido correctamente."
          : "Imagen subida correctamente.",
    };
  } catch (error) {
    console.error("Error al subir archivo multimedia de cliente", error);

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido subir el archivo.",
    };
  }
}

async function deleteFotoCliente(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const fotoId = requiredId(formData, "fotoId");

  const foto = await prisma.fotoCliente.findFirst({
    where: {
      id: fotoId,
      clienteId,
    },
  });
  if (!foto) {
    throw new Error("Archivo no encontrado.");
  }

  const expectedPrefix = `/uploads/clientes/${clienteId}/`;
  const filePath = uploadFilePathFromUrl(foto.url, clienteId);
  if (filePath) {
    await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  } else if (foto.url.startsWith(expectedPrefix)) {
    console.warn("FotoCliente antigua sin archivo persistente", {
      clienteId,
      fotoId,
      url: foto.url,
    });
  }

  await prisma.fotoCliente.delete({
    where: { id: foto.id },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

async function updateClienteFicha(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const data = clienteEditableData(formData);
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true, motivoRechazo: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  await prisma.cliente.update({
    where: { id: clienteId },
    data,
  });

  const estadoCambiado = cliente.estado !== data.estado;
  const motivoCambiado = cliente.motivoRechazo !== data.motivoRechazo;

  if (estadoCambiado || motivoCambiado) {
    const estadoDetalle = estadoCambiado
      ? data.estado === estadoPerdido
        ? `Estado cambiado a ${data.estado}. Estado anterior: ${cliente.estado}.`
        : `Estado cambiado de ${cliente.estado} a ${data.estado}.`
      : "Motivo de rechazo actualizado.";
    const motivoDetalle =
      data.estado === estadoPerdido
        ? ` Motivo de rechazo: ${data.motivoRechazo}.`
        : "";

    await registrarActividadCliente({
      clienteId,
      tipo: "ESTADO_CAMBIADO",
      descripcion: `${estadoDetalle}${motivoDetalle}`,
    });
  }

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/clientes/perdidos");
  revalidatePath("/kanban");
  revalidatePath(`/clientes/${clienteId}`);
}

async function cambiarEstadoCliente(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const estado = estadoValue(formData);
  const motivoRechazo = motivoRechazoValue(formData, estado);
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true, motivoRechazo: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const clienteActualizado = await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      estado,
      motivoRechazo,
    },
    select: {
      estado: true,
      motivoRechazo: true,
    },
  });

  const estadoCambiado = cliente.estado !== clienteActualizado.estado;
  const motivoCambiado =
    cliente.motivoRechazo !== clienteActualizado.motivoRechazo;

  if (estadoCambiado || motivoCambiado) {
    const estadoDetalle = estadoCambiado
      ? clienteActualizado.estado === estadoPerdido
        ? `Estado cambiado a ${clienteActualizado.estado}. Estado anterior: ${cliente.estado}.`
        : `Estado cambiado de ${cliente.estado} a ${clienteActualizado.estado}.`
      : "Motivo de rechazo actualizado.";
    const motivoDetalle =
      clienteActualizado.estado === estadoPerdido
        ? ` Motivo de rechazo: ${clienteActualizado.motivoRechazo}.`
        : "";

    await registrarActividadCliente({
      clienteId,
      tipo: "ESTADO_CAMBIADO",
      descripcion: `${estadoDetalle}${motivoDetalle}`,
    });
  }

  revalidatePath("/");
  revalidatePath("/clientes");
  revalidatePath("/clientes/perdidos");
  revalidatePath("/kanban");
  revalidatePath(`/clientes/${clienteId}`);
}

async function convertirClienteEnTrabajoTerminado(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      nombre: true,
      localidad: true,
      tipoTrabajo: true,
      tipoCliente: true,
      importeAceptado: true,
      fechaInstalacion: true,
      observaciones: true,
      presupuestos: {
        where: { estado: "ACEPTADO" },
        select: {
          totalConIva: true,
          importe: true,
        },
      },
    },
  });

  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const totalAceptadoPresupuestos = cliente.presupuestos.reduce(
    (sum, presupuesto) =>
      sum +
      (Number(presupuesto.totalConIva) || Number(presupuesto.importe) || 0),
    0,
  );
  const importe = cliente.importeAceptado
    ? Number(cliente.importeAceptado)
    : totalAceptadoPresupuestos;
  const tipoTrabajo =
    cliente.tipoTrabajo || cliente.tipoCliente || "Trabajo terminado";
  const trabajo = await prisma.trabajoTerminado.create({
    data: {
      titulo: cliente.tipoTrabajo || cliente.nombre,
      clienteNombre: cliente.nombre,
      localidad: cliente.localidad || "Sin localidad",
      tipoTrabajo,
      descripcion:
        cliente.observaciones ||
        `Trabajo terminado creado desde la ficha comercial de ${cliente.nombre}.`,
      importe: importe.toFixed(2),
      fechaTrabajo: cliente.fechaInstalacion || new Date(),
      destacadoWeb: false,
    },
  });

  await registrarActividadCliente({
    clienteId,
    tipo: "CLIENTE_CONVERTIDO_TRABAJO",
    descripcion: "Cliente convertido en trabajo terminado",
  });

  revalidatePath("/");
  revalidatePath("/trabajos");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/trabajos/${trabajo.id}`);
}

async function getCliente(id: number) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      seguimientos: {
        orderBy: { fecha: "desc" },
      },
      fotos: true,
      presupuestos: {
        orderBy: { fecha: "desc" },
        include: {
          lineas: {
            orderBy: { id: "asc" },
          },
          pagosCuenta: {
            orderBy: { fechaPago: "desc" },
          },
          facturasVenta: {
            select: {
              id: true,
            },
          },
        },
      },
      facturasVenta: {
        orderBy: [{ fechaFactura: "desc" }, { createdAt: "desc" }],
        include: {
          presupuesto: {
            select: {
              id: true,
              numero: true,
              titulo: true,
            },
          },
        },
      },
      pagosCuenta: {
        orderBy: { fechaPago: "desc" },
        include: {
          presupuesto: {
            select: {
              id: true,
              numero: true,
              titulo: true,
            },
          },
        },
      },
      actividades: {
        orderBy: { fecha: "desc" },
      },
    },
  });

  return cliente;
}

type ClienteDetalle = NonNullable<Awaited<ReturnType<typeof getCliente>>>;

function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: unknown) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function displayTipoCliente(
  cliente: Pick<ClienteDetalle, "tipoCliente" | "tipoTrabajo">,
) {
  return cliente.tipoCliente || cliente.tipoTrabajo || "-";
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function estadoClass(estado: string) {
  return estadoStyles[estado] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
}

function presupuestoEstadoClass(estado: string) {
  const styles: Record<PresupuestoEstado, string> = {
    PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-200",
    ACEPTADO: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    RECHAZADO: "bg-rose-100 text-rose-900 ring-rose-200",
    INSTALADO: "bg-teal-100 text-teal-900 ring-teal-200",
  };

  return (
    styles[estado as PresupuestoEstado] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function facturaEstadoCobroClass(estado: string) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-200",
    PARCIAL: "bg-sky-100 text-sky-900 ring-sky-200",
    COBRADA: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  };

  return styles[estado] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
}

function toDateInputValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function isSeguimientoVencido(cliente: ClienteDetalle) {
  return Boolean(
    cliente.fechaSeguimiento &&
      cliente.fechaSeguimiento < startOfToday() &&
      cliente.estado !== "Instalado" &&
      cliente.estado !== "Perdido",
  );
}

function DetailItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-neutral-950">
        {children ?? value ?? "-"}
      </dd>
    </div>
  );
}

function currencyInputValue(value: unknown) {
  return value ? Number(value).toFixed(2) : "";
}

function sumCurrency<T>(items: T[], selector: (item: T) => unknown) {
  return items.reduce((sum, item) => sum + Number(selector(item) ?? 0), 0);
}

function presupuestoTotal(presupuesto: Pick<ClienteDetalle["presupuestos"][number], "totalConIva" | "importe">) {
  return Number(presupuesto.totalConIva) || Number(presupuesto.importe) || 0;
}

function totalPagadoPresupuesto(
  presupuesto: Pick<ClienteDetalle["presupuestos"][number], "pagosCuenta">,
) {
  return sumCurrency(presupuesto.pagosCuenta, (pago) => pago.importe);
}

function resumenPagosCliente(cliente: ClienteDetalle) {
  const totalPresupuestadoAceptado = sumCurrency(
    cliente.presupuestos.filter((presupuesto) => presupuesto.estado === "ACEPTADO"),
    presupuestoTotal,
  );
  const totalPagadoCuenta = sumCurrency(cliente.pagosCuenta, (pago) => pago.importe);

  return {
    totalPresupuestadoAceptado,
    totalPagadoCuenta,
    pendienteCobro: totalPresupuestadoAceptado - totalPagadoCuenta,
  };
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
}) {
  const current = defaultValue && options.includes(defaultValue)
    ? defaultValue
    : options[0];

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} name={name} defaultValue={current}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function successFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

function SuccessMessage() {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-sm">
      Presupuesto eliminado correctamente.
    </div>
  );
}

function FotoUploadForm({ clienteId }: { clienteId: number }) {
  return <MultimediaUploadForm clienteId={clienteId} action={uploadFotoCliente} />;
}

function ConvertirTrabajoTerminadoCard({
  cliente,
}: {
  cliente: ClienteDetalle;
}) {
  const destacado = estadosTrabajoTerminadoDestacado.includes(
    cliente.estado as (typeof estadosTrabajoTerminadoDestacado)[number],
  );

  return (
    <section
      className={`rounded-md border p-5 shadow-sm ${
        destacado
          ? "border-emerald-300 bg-emerald-50"
          : "border-neutral-300 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">
            Trabajo terminado
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Crea una ficha en la biblioteca de trabajos con los datos comerciales
            de este cliente.
          </p>
        </div>
        <form action={convertirClienteEnTrabajoTerminado}>
          <input type="hidden" name="clienteId" value={cliente.id} />
          <button
            type="submit"
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition ${
              destacado
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            Convertir en trabajo terminado
          </button>
        </form>
      </div>
    </section>
  );
}

function CambiarEstadoForm({ cliente }: { cliente: ClienteDetalle }) {
  return (
    <section
      id="cambiar-estado"
      className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-neutral-950">
          Cambiar estado
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Actualiza rapidamente la fase comercial del cliente.
        </p>
      </div>
      <form action={cambiarEstadoCliente} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="clienteId" value={cliente.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <ClienteEstadoFields
            estados={estados}
            motivosRechazo={motivosRechazo}
            defaultEstado={cliente.estado}
            defaultMotivoRechazo={cliente.motivoRechazo}
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Guardar estado
        </button>
      </form>
    </section>
  );
}

function ClienteEditForm({ cliente }: { cliente: ClienteDetalle }) {
  return (
    <section
      id="editar-cliente"
      className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-neutral-950">
          Editar cliente
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Datos comerciales, fechas, presupuesto y observaciones.
        </p>
      </div>
      <form action={updateClienteFicha} className="grid gap-4">
        <input type="hidden" name="clienteId" value={cliente.id} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nombre</span>
            <input
              className={inputClass}
              name="nombre"
              defaultValue={cliente.nombre}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Telefono</span>
            <input
              className={inputClass}
              name="telefono"
              type="tel"
              defaultValue={cliente.telefono ?? ""}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              name="email"
              type="email"
              defaultValue={cliente.email ?? ""}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Direccion</span>
            <input
              className={inputClass}
              name="direccion"
              defaultValue={cliente.direccion ?? ""}
            />
          </label>
          <LocalidadField
            localidades={localidades}
            defaultValue={cliente.localidad}
          />
          <SelectField
            label="Origen del contacto"
            name="origenContacto"
            options={origenesContacto}
            defaultValue={cliente.origenContacto}
          />
          <SelectField
            label="Tipo de cliente"
            name="tipoCliente"
            options={tiposCliente}
            defaultValue={displayTipoCliente(cliente)}
          />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Presupuesto</span>
            <input
              className={inputClass}
              name="presupuesto"
              type="number"
              min="0"
              step="0.01"
              defaultValue={currencyInputValue(cliente.presupuesto)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Importe aceptado</span>
            <input
              className={inputClass}
              name="importeAceptado"
              type="number"
              min="0"
              step="0.01"
              defaultValue={currencyInputValue(cliente.importeAceptado)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha de alta</span>
            <input
              className={inputClass}
              name="fechaAlta"
              type="date"
              defaultValue={toDateInputValue(cliente.fechaAlta)}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha de seguimiento</span>
            <input
              className={inputClass}
              name="fechaSeguimiento"
              type="date"
              defaultValue={toDateInputValue(cliente.fechaSeguimiento)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha de medicion</span>
            <input
              className={inputClass}
              name="fechaMedicion"
              type="date"
              defaultValue={toDateInputValue(cliente.fechaMedicion)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha de instalacion</span>
            <input
              className={inputClass}
              name="fechaInstalacion"
              type="date"
              defaultValue={toDateInputValue(cliente.fechaInstalacion)}
            />
          </label>
          <ClienteEstadoFields
            estados={estados}
            motivosRechazo={motivosRechazo}
            defaultEstado={cliente.estado}
            defaultMotivoRechazo={cliente.motivoRechazo}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observaciones</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            name="observaciones"
            defaultValue={cliente.observaciones ?? ""}
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Guardar cliente
        </button>
      </form>
    </section>
  );
}

function FotosGaleria({
  cliente,
  tipo,
  title,
  subtitle,
}: {
  cliente: ClienteDetalle;
  tipo: FotoTipo;
  title: string;
  subtitle: string;
}) {
  const archivos = cliente.fotos.filter((foto) => foto.tipo === tipo);

  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {archivos.length} archivos
        </span>
      </div>

      {archivos.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {archivos.map((foto) => (
            <FotoCard key={foto.id} clienteId={cliente.id} foto={foto} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          No hay archivos en esta seccion.
        </p>
      )}
    </section>
  );
}

function PagosCuentaSection({ cliente }: { cliente: ClienteDetalle }) {
  const resumen = resumenPagosCliente(cliente);

  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Pagos a cuenta</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Importes recibidos antes de finalizar el trabajo.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {cliente.pagosCuenta.length} pagos
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Total presupuestado aceptado
          </p>
          <p className="mt-2 text-xl font-semibold text-neutral-950">
            {formatCurrency(resumen.totalPresupuestadoAceptado)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Total pagado a cuenta
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">
            {formatCurrency(resumen.totalPagadoCuenta)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Pendiente de cobro
          </p>
          <p className="mt-2 text-xl font-semibold text-neutral-950">
            {formatCurrency(resumen.pendienteCobro)}
          </p>
        </div>
      </div>

      <form
        action={createPagoCuenta}
        className="mt-5 grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
      >
        <input type="hidden" name="clienteId" value={cliente.id} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Presupuesto asociado</span>
            <select className={inputClass} name="presupuestoId" defaultValue="">
              <option value="">Sin asociar</option>
              {cliente.presupuestos.map((presupuesto) => (
                <option key={presupuesto.id} value={presupuesto.id}>
                  {presupuesto.numero} · {presupuesto.titulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Concepto</span>
            <input
              className={inputClass}
              name="concepto"
              defaultValue="Pago a cuenta 50%"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Importe</span>
            <input
              className={inputClass}
              name="importe"
              type="number"
              step="0.01"
              min="0"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha de pago</span>
            <input
              className={inputClass}
              name="fechaPago"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Método de pago</span>
            <select className={inputClass} name="metodoPago" defaultValue="Transferencia">
              {metodosPago.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {metodo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Referencia</span>
            <input className={inputClass} name="referencia" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observaciones</span>
          <textarea className={`${inputClass} min-h-20 resize-y`} name="observaciones" />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Registrar pago
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Presupuesto</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {cliente.pagosCuenta.length > 0 ? (
              cliente.pagosCuenta.map((pago) => (
                <tr key={pago.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatDate(pago.fechaPago)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-neutral-950">{pago.concepto}</p>
                    {pago.observaciones ? (
                      <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                        {pago.observaciones}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {pago.presupuesto ? (
                      <>
                        <p className="font-semibold text-neutral-950">
                          {pago.presupuesto.numero}
                        </p>
                        <p className="mt-1 text-neutral-500">
                          {pago.presupuesto.titulo}
                        </p>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">{pago.metodoPago}</td>
                  <td className="px-4 py-4 text-neutral-700">
                    {pago.referencia || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-neutral-950">
                    {formatCurrency(pago.importe)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <DeletePagoCuentaForm
                      action={deletePagoCuenta}
                      clienteId={cliente.id}
                      pagoId={pago.id}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Todavia no hay pagos a cuenta registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FacturasVentaSection({ cliente }: { cliente: ClienteDetalle }) {
  const presupuestosFacturables = cliente.presupuestos
    .filter((presupuesto) => presupuesto.estado === "ACEPTADO" || presupuesto.estado === "INSTALADO")
    .map((presupuesto) => ({
      id: presupuesto.id,
      numero: presupuesto.numero,
      titulo: presupuesto.titulo,
    }));

  return (
    <section
      id="facturas-venta"
      className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">
            FACTURAS DE VENTA
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            PDFs emitidos por la gestoría y asociados a este cliente.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {cliente.facturasVenta.length} facturas
        </span>
      </div>

      <FacturaVentaForm
        action={createFacturaVenta}
        cliente={{ id: cliente.id, nombre: cliente.nombre }}
        presupuestos={presupuestosFacturables}
        returnTo={`/clientes/${cliente.id}`}
        submitLabel="Subir factura"
      />

      <div className="mt-5 overflow-x-auto rounded-md border border-neutral-200">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nº Factura</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado Cobro</th>
              <th className="px-4 py-3">PDF</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {cliente.facturasVenta.length > 0 ? (
              cliente.facturasVenta.map((factura) => (
                <tr key={factura.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-neutral-950">
                      {factura.numeroFactura}
                    </p>
                    {factura.presupuesto ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        Presupuesto {factura.presupuesto.numero}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatDate(factura.fechaFactura)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-neutral-950">
                    {formatCurrency(factura.total)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${facturaEstadoCobroClass(
                        factura.estadoCobro,
                      )}`}
                    >
                      {factura.estadoCobro}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <a
                        href={factura.archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-neutral-800 underline underline-offset-2"
                      >
                        Ver PDF
                      </a>
                      <a
                        href={factura.archivoUrl}
                        download
                        className="font-semibold text-neutral-800 underline underline-offset-2"
                      >
                        Descargar PDF
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/facturas-venta/${factura.id}/editar?returnTo=${encodeURIComponent(
                          `/clientes/${cliente.id}`,
                        )}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Editar
                      </Link>
                      <DeleteFacturaVentaForm
                        facturaId={factura.id}
                        returnTo={`/clientes/${cliente.id}`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Todavia no hay facturas de venta asociadas a este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PresupuestosSection({ cliente }: { cliente: ClienteDetalle }) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Presupuestos</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Presupuestos asociados a este cliente.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {cliente.presupuestos.length} presupuestos
        </span>
      </div>

      <form
        action={createPresupuesto}
        className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
      >
        <input type="hidden" name="clienteId" value={cliente.id} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
            <span className={labelClass}>Numero</span>
            <p className="mt-1 font-medium text-neutral-950">
              Se generara automaticamente
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Titulo</span>
            <input className={inputClass} name="titulo" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Fecha</span>
            <input
              className={inputClass}
              name="fecha"
              type="date"
              defaultValue={toDateInputValue(new Date())}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Estado</span>
            <select className={inputClass} name="estado" defaultValue="PENDIENTE">
              {presupuestoEstados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Validez (dias)</span>
            <input
              className={inputClass}
              name="validezDias"
              type="number"
              min="0"
              defaultValue={defaultPresupuestoValidezDias}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>IVA (%)</span>
            <input
              className={inputClass}
              name="ivaPorcentaje"
              type="number"
              step="0.01"
              min="0"
              defaultValue="21"
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Descripcion</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            name="descripcion"
            required
          />
        </label>
        <div className="grid gap-3">
          <p className={labelClass}>Lineas</p>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-md border border-neutral-200 bg-white p-3 lg:grid-cols-[1fr_1.4fr_120px_160px]"
            >
              <input
                className={inputClass}
                name={`lineas[${index}][concepto]`}
                placeholder="Concepto"
                required={index === 0}
              />
              <input
                className={inputClass}
                name={`lineas[${index}][descripcion]`}
                placeholder="Descripcion"
              />
              <input
                className={inputClass}
                name={`lineas[${index}][cantidad]`}
                type="number"
                step="0.01"
                min="0"
                placeholder="Cantidad"
                required={index === 0}
              />
              <input
                className={inputClass}
                name={`lineas[${index}][precioUnitario]`}
                type="number"
                step="0.01"
                min="0"
                placeholder="Precio unitario"
                required={index === 0}
              />
            </div>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observaciones</span>
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            name="observaciones"
            defaultValue={defaultPresupuestoObservaciones}
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Crear presupuesto
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3">Numero</th>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Importe</th>
              <th className="px-4 py-3">Pagos</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {cliente.presupuestos.length > 0 ? (
              cliente.presupuestos.map((presupuesto) => {
                const totalPresupuesto = presupuestoTotal(presupuesto);
                const pagado = totalPagadoPresupuesto(presupuesto);
                const pendiente = totalPresupuesto - pagado;
                const isFacturable =
                  presupuesto.estado === "ACEPTADO" ||
                  presupuesto.estado === "INSTALADO";
                const isFacturado = presupuesto.facturasVenta.length > 0;

                return (
                  <tr key={presupuesto.id} className="align-top">
                    <td className="px-4 py-4 font-semibold text-neutral-950">
                      {presupuesto.numero}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-neutral-950">
                        {presupuesto.titulo}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                        {presupuesto.descripcion}
                      </p>
                      <div className="mt-3 overflow-hidden rounded-md border border-neutral-200">
                        <table className="w-full text-xs">
                          <thead className="bg-white text-neutral-500">
                            <tr>
                              <th className="px-3 py-2 text-left">Concepto</th>
                              <th className="px-3 py-2 text-right">Cant.</th>
                              <th className="px-3 py-2 text-right">Precio</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 bg-white">
                            {presupuesto.lineas.map((linea) => (
                              <tr key={linea.id}>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-neutral-800">
                                    {linea.concepto}
                                  </p>
                                  {linea.descripcion ? (
                                    <p className="mt-1 text-neutral-500">
                                      {linea.descripcion}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-right text-neutral-700">
                                  {Number(linea.cantidad).toLocaleString("es-ES")}
                                </td>
                                <td className="px-3 py-2 text-right text-neutral-700">
                                  {formatCurrency(linea.precioUnitario)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-neutral-950">
                                  {formatCurrency(linea.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                      <p>{formatCurrency(presupuesto.totalConIva)}</p>
                      <p className="mt-1 text-xs font-medium text-neutral-500">
                        Base {formatCurrency(presupuesto.totalSinIva)}
                      </p>
                      <p className="text-xs font-medium text-neutral-500">
                        IVA {formatCurrency(presupuesto.totalIva)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <p className="font-semibold text-emerald-800">
                        Pagado {formatCurrency(pagado)}
                      </p>
                      <p className="mt-1 font-semibold text-neutral-950">
                        Pendiente {formatCurrency(pendiente)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {isFacturable ? (
                        <div className="grid gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              isFacturado
                                ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                                : "bg-amber-100 text-amber-900 ring-amber-200"
                            }`}
                          >
                            {isFacturado ? "Facturado" : "Sin factura"}
                          </span>
                          {!isFacturado ? (
                            <a
                              href="#facturas-venta"
                              className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                            >
                              Crear factura
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500">No aplica</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${presupuestoEstadoClass(
                          presupuesto.estado,
                        )}`}
                      >
                        {presupuesto.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                      {formatDate(presupuesto.fecha)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/presupuestos/${presupuesto.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Ver presupuesto
                      </Link>
                      <Link
                        href={`/presupuestos/${presupuesto.id}/pdf`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Descargar PDF
                      </Link>
                      <Link
                        href={`/presupuestos/${presupuesto.id}/pdf/ver`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Ver PDF
                      </Link>
                      <Link
                        href={`/presupuestos/${presupuesto.id}/editar?returnTo=${encodeURIComponent(
                          `/clientes/${cliente.id}`,
                        )}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Editar presupuesto
                      </Link>
                      <WhatsAppPresupuestoLink
                        presupuestoId={presupuesto.id}
                        publicToken={presupuesto.publicToken}
                        nombreCliente={cliente.nombre}
                        telefono={cliente.telefono}
                        numero={presupuesto.numero}
                        titulo={presupuesto.titulo}
                        totalConIva={Number(presupuesto.totalConIva)}
                      />
                      <DeletePresupuestoForm
                        presupuestoId={presupuesto.id}
                        returnTo={`/clientes/${cliente.id}`}
                      />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  Todavia no hay presupuestos para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistorialActividad({ cliente }: { cliente: ClienteDetalle }) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">
            HISTORIAL DE ACTIVIDAD
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cambios y acciones comerciales registradas automaticamente.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {cliente.actividades.length} acciones
        </span>
      </div>

      {cliente.actividades.length > 0 ? (
        <ol className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {cliente.actividades.map((actividad) => (
            <li key={actividad.id} className="grid gap-1 px-4 py-3">
              <time className="text-sm font-semibold text-neutral-950">
                {formatDateTime(actividad.fecha)}
              </time>
              <p className="text-sm text-neutral-700">{actividad.descripcion}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          Todavia no hay actividad registrada para este cliente.
        </p>
      )}
    </section>
  );
}

function FotoCard({
  clienteId,
  foto,
}: {
  clienteId: number;
  foto: ClienteDetalle["fotos"][number];
}) {
  const isVideo = foto.tipoArchivo === "VIDEO";
  const canRenderFile = renderablePublicUploadUrl(foto.url, clienteId);

  return (
    <article className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
      {canRenderFile && isVideo ? (
        <video
          controls
          preload="metadata"
          src={foto.url}
          className="h-44 w-full bg-neutral-950 object-contain"
        />
      ) : canRenderFile ? (
        <a href={foto.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.url}
            alt={foto.descripcion || foto.nombreArchivo}
            className="h-44 w-full object-cover"
          />
        </a>
      ) : (
        <div className="flex h-44 w-full flex-col items-center justify-center bg-rose-50 px-4 text-center text-rose-800">
          <p className="text-sm font-semibold">Archivo no disponible</p>
          <p className="mt-1 break-all text-xs text-rose-700">
            URL invalida o antigua
          </p>
        </div>
      )}
      <div className="grid gap-3 p-3">
        <div>
          <p className="truncate text-sm font-semibold text-neutral-950">
            {foto.nombreArchivo}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {formatDateTime(foto.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-neutral-200 px-2 py-1 text-neutral-700">
              {isVideo ? "Vídeo" : "Imagen"}
            </span>
            <span className="rounded-full bg-neutral-200 px-2 py-1 text-neutral-700">
              {formatFileSize(foto.tamanoBytes)}
            </span>
          </div>
          {foto.descripcion ? (
            <p className="mt-2 text-sm text-neutral-700">{foto.descripcion}</p>
          ) : null}
          {isVideo ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
              Vídeo temporal: eliminar cuando ya no sea necesario.
            </p>
          ) : null}
          {!canRenderFile ? (
            <p className="mt-2 break-all text-xs text-rose-700">
              {foto.url || "Sin URL guardada"}
            </p>
          ) : null}
        </div>
        <form action={deleteFotoCliente}>
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="fotoId" value={foto.id} />
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            {canRenderFile ? "Eliminar" : "Eliminar registro invalido"}
          </button>
        </form>
      </div>
    </article>
  );
}

function ClienteFicha({ cliente }: { cliente: ClienteDetalle }) {
  const seguimientoVencido = isSeguimientoVencido(cliente);

  return (
    <section className="grid gap-4">
      {seguimientoVencido ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-5 py-4 text-rose-950 shadow-sm">
          <p className="text-sm font-semibold">Seguimiento vencido</p>
          <p className="mt-1 text-sm">
            La fecha de seguimiento era el {formatDate(cliente.fechaSeguimiento)}.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Datos completos
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Informacion comercial y contacto del cliente.
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ring-1 ${estadoClass(
                cliente.estado,
              )}`}
            >
              {cliente.estado}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem label="Nombre" value={cliente.nombre} />
            <DetailItem label="Telefono">
              <PhoneContactActions telefono={cliente.telefono} />
            </DetailItem>
            <DetailItem label="Email">
              <EmailContactAction email={cliente.email} />
            </DetailItem>
            <DetailItem label="Direccion" value={cliente.direccion} />
            <DetailItem label="Localidad" value={cliente.localidad} />
            <DetailItem
              label="Origen del contacto"
              value={cliente.origenContacto}
            />
            <DetailItem
              label="Tipo de cliente"
              value={displayTipoCliente(cliente)}
            />
            <DetailItem
              label="Presupuesto"
              value={formatCurrency(cliente.presupuesto)}
            />
            <DetailItem
              label="Importe aceptado"
              value={formatCurrency(cliente.importeAceptado)}
            />
            <DetailItem label="Fecha de alta" value={formatDate(cliente.fechaAlta)} />
            <DetailItem
              label="Fecha de seguimiento"
              value={formatDate(cliente.fechaSeguimiento)}
            />
            <DetailItem
              label="Fecha de medición"
              value={formatDate(cliente.fechaMedicion)}
            />
            <DetailItem
              label="Fecha de instalación"
              value={formatDate(cliente.fechaInstalacion)}
            />
            {cliente.estado === "Perdido" ? (
              <DetailItem
                label="Motivo de rechazo"
                value={cliente.motivoRechazo}
              />
            ) : null}
            <DetailItem label="Creado" value={formatDate(cliente.createdAt)} />
            <DetailItem label="Actualizado" value={formatDate(cliente.updatedAt)} />
          </dl>

          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Observaciones
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {cliente.observaciones || "-"}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Seguimientos</h2>
          <form action={addSeguimiento} className="mt-4 grid gap-3">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Nueva nota</span>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                name="nota"
                required
                placeholder="Anota llamada, visita, medicion o proximo paso"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Añadir seguimiento
            </button>
          </form>

          <div className="mt-5 overflow-hidden rounded-md border border-neutral-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {cliente.seguimientos.length > 0 ? (
                  cliente.seguimientos.map((seguimiento) => (
                    <tr key={seguimiento.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                        {formatDateTime(seguimiento.fecha)}
                      </td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-neutral-800">
                        {seguimiento.nota}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-neutral-500"
                    >
                      Todavia no hay notas de seguimiento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CambiarEstadoForm cliente={cliente} />

      <ClienteEditForm cliente={cliente} />

      <ConvertirTrabajoTerminadoCard cliente={cliente} />

      <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              Archivos / multimedia
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Sube fotos, videos del cliente o propuestas visuales de Juanser.
            </p>
          </div>
          <span className="text-sm font-semibold text-neutral-700">
            {cliente.fotos.length} archivos
          </span>
        </div>
        <FotoUploadForm clienteId={cliente.id} />
      </section>

      <FotosGaleria
        cliente={cliente}
        tipo="CLIENTE"
        title="Archivos aportados por el cliente"
        subtitle="Fotos o videos del hueco actual, muebles a reparar, medidas, ideas o referencias."
      />
      <FotosGaleria
        cliente={cliente}
        tipo="JUANSER"
        title="Propuestas de Juanser"
        subtitle="Renders IA, bocetos, disenos, videos, acabados y simulaciones."
      />

      <PagosCuentaSection cliente={cliente} />

      <FacturasVentaSection cliente={cliente} />

      <PresupuestosSection cliente={cliente} />

      <HistorialActividad cliente={cliente} />
    </section>
  );
}

type ClientePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ presupuestoEliminado?: string | string[] }>;
};

export default async function ClientePage({
  params,
  searchParams,
}: ClientePageProps) {
  await connection();

  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const cliente = await getCliente(id);
  if (!cliente) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/clientes"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al listado
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {cliente.nombre}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Ficha comercial individual
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="#editar-cliente"
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Editar cliente
            </a>
            <a
              href="#cambiar-estado"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Cambiar estado
            </a>
            <DeleteClienteForm
              clienteId={cliente.id}
              label="Eliminar cliente"
              className="inline-flex h-10 items-center justify-center rounded-md bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800"
            />
          </div>
        </header>

        {successFromParam(search.presupuestoEliminado) ? <SuccessMessage /> : null}

        <ClienteFicha cliente={cliente} />
      </div>
    </main>
  );
}
