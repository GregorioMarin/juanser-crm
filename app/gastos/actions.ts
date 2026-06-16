"use server";

import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { uploadsRootDir } from "@/app/lib/uploads";
import { formatDecimalEs, parseDecimalEs } from "@/app/lib/decimal-es";
import {
  categoriasGasto,
  emptyGastoAnalizado,
  formasPagoGasto,
  GastoAnalizado,
  GastoLineaAnalizada,
  tiposGasto,
} from "@/app/gastos/constants";
import {
  categoriasMaterial,
  prefijoCategoriaMaterial,
  unidadesMaterial,
} from "@/app/materiales/constants";

export type AnalizarGastoState = {
  status: "idle" | "success" | "error";
  message: string | null;
  archivoUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  data: GastoAnalizado;
};

export type GastoFormState = {
  status: "idle" | "error";
  message: string | null;
};

export type MaterialLineaState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const maxDocumentSize = 20 * 1024 * 1024;
const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf"] as const;
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function isSerreriaAlmeriense(proveedor: string | null) {
  return proveedor
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("serreria almeriense") ?? false;
}

function normalizedText(value: string | null) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() ?? "";
}

function proveedorTipo(proveedor: string | null) {
  const normalized = normalizedText(proveedor);
  if (normalized.includes("serreria almeriense")) {
    return "SERRERIA_ALMERIENSE";
  }
  if (normalized.includes("verdu")) {
    return "VERDU";
  }

  return "GENERICO";
}

function isInternalMaterialCode(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toUpperCase();
  const prefixes = categoriasMaterial.map((categoria) =>
    prefijoCategoriaMaterial(categoria).toUpperCase(),
  );

  return prefixes.some(
    (prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}-`),
  );
}

function normalizeDetectedProviderCode(value: string | null) {
  return value?.replace(/(\d+)\s*\.\s*(\d+)/g, "$1.$2") ?? null;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredGastoId(formData: FormData) {
  const id = optionalString(formData, "gastoId");
  if (!id) {
    throw new Error("Gasto no valido.");
  }

  return id;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`El campo ${key} debe ser una fecha valida.`);
  }

  return date;
}

function optionalDecimal(formData: FormData, key: string) {
  const parsed = parseDecimalEs(optionalString(formData, key), 2);
  if (parsed === null && optionalString(formData, key)) {
    throw new Error(`El campo ${key} debe ser un importe decimal valido.`);
  }

  return parsed;
}

function optionalDecimalFromValue(raw: string | null, fieldLabel: string, scale = 2) {
  const parsed = parseDecimalEs(raw, scale);
  if (parsed === null && raw?.trim()) {
    throw new Error(`${fieldLabel} debe ser un importe decimal valido.`);
  }

  return parsed;
}

function optionalBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function requiredOrCalculatedTotal(formData: FormData) {
  const total = optionalDecimal(formData, "total");
  if (total) {
    return total;
  }

  const baseImponible = optionalDecimal(formData, "baseImponible");
  const iva = optionalDecimal(formData, "iva");
  if (baseImponible && iva) {
    return (Number(baseImponible) + Number(iva)).toFixed(2);
  }

  const lineasTotal = formData
    .getAll("lineaIndex")
    .filter((value): value is string => typeof value === "string")
    .reduce((sum, index) => {
      if (optionalBoolean(formData, `linea-${index}-esPendienteServir`)) {
        return sum;
      }

      const importe = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-importe`),
        "Importe de linea",
      );
      if (importe) {
        return sum + Number(importe);
      }

      const descuento = Number(
        optionalDecimalFromValue(
          optionalString(formData, `linea-${index}-descuentoPorcentaje`),
          "Descuento de linea",
        ) ?? 0,
      );
      const cantidad = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-cantidad`),
        "Cantidad de linea",
      );
      const precioUnitario = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-precioUnitario`),
        "Precio unitario de linea",
      );
      const medida = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-medida`),
        "Medida de linea",
        3,
      );
      const precioUnidadMedida = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-precioUnidadMedida`),
        "Precio por unidad de medida de linea",
        5,
      );
      const bruto =
        cantidad && precioUnitario
          ? Number(cantidad) * Number(precioUnitario)
          : medida && precioUnidadMedida
            ? Number(medida) * Number(precioUnidadMedida)
            : 0;

      return sum + bruto * (1 - descuento / 100);
    }, 0);

  return lineasTotal > 0 ? lineasTotal.toFixed(2) : null;
}

function optionValue<T extends readonly string[]>(
  value: string | null,
  options: T,
  fallback: T[number] | null,
) {
  if (!value) {
    return fallback;
  }

  return options.includes(value) ? value : fallback;
}

function normalizeTipoDocumento(value: string | null) {
  const normalized = normalizedText(value).toUpperCase();
  if (normalized === "ALBARAN") {
    return "ALBARAN";
  }
  if (normalized === "FACTURA") {
    return "FACTURA";
  }
  if (normalized === "TICKET") {
    return "TICKET";
  }
  if (normalized === "OTRO") {
    return "OTRO";
  }

  return null;
}

async function nextNumeroInterno(
  tx: Pick<typeof prisma, "$queryRaw">,
  tipoDocumento: string | null,
) {
  const prefixes: Record<string, string> = {
    ALBARAN: "ALB",
    FACTURA: "FAC",
    TICKET: "TCK",
    OTRO: "DOC",
  };
  const prefix = tipoDocumento ? prefixes[tipoDocumento] : null;

  if (!tipoDocumento || !prefix) {
    return null;
  }

  const rows = await tx.$queryRaw<{ ultimoNumero: number }[]>`
    INSERT INTO "DocumentoSecuencia" ("tipoDocumento", "ultimoNumero", "updatedAt")
    VALUES (${tipoDocumento}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("tipoDocumento")
    DO UPDATE SET "ultimoNumero" = "DocumentoSecuencia"."ultimoNumero" + 1,
                  "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "ultimoNumero"
  `;
  const number = rows[0]?.ultimoNumero ?? 1;

  return `${prefix}-${String(number).padStart(4, "0")}`;
}

function optionalClienteId(formData: FormData) {
  const raw = optionalString(formData, "clienteId");
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cliente no valido.");
  }

  return id;
}

function tipoGastoValue(formData: FormData) {
  const value = optionalString(formData, "tipoGasto") ?? "Otros";
  if (!tiposGasto.includes(value as (typeof tiposGasto)[number])) {
    throw new Error("Tipo de gasto no valido.");
  }

  return value;
}

function isMaterialesTipo(tipoGasto: string | null) {
  return tipoGasto === "Materiales";
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`El campo ${key} es obligatorio.`);
  }

  return value;
}

function requiredLineaMaterialIds(formData: FormData) {
  const gastoId = requiredGastoId(formData);
  const lineaId = requiredString(formData, "lineaId");

  return { gastoId, lineaId };
}

function categoriaMaterialValue(formData: FormData) {
  const value = optionalString(formData, "categoria") ?? "Otros";
  if (!categoriasMaterial.includes(value as (typeof categoriasMaterial)[number])) {
    throw new Error("Categoria de material no valida.");
  }

  return value;
}

function unidadBaseMaterialValue(formData: FormData) {
  const value = optionalString(formData, "unidadBase");
  if (!value) {
    return null;
  }

  if (!unidadesMaterial.includes(value as (typeof unidadesMaterial)[number])) {
    throw new Error("Unidad base no valida.");
  }

  return value;
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

async function lineasCreateData(
  lineas: ReturnType<typeof lineasData>,
  tx: Pick<typeof prisma, "material">,
) {
  const data = [];

  for (const linea of lineas) {
    const materialNombre = linea.newMaterial.nombre;
    if (materialNombre) {
      const categoria = linea.newMaterial.categoria ?? "Otros";
      if (!categoriasMaterial.includes(categoria as (typeof categoriasMaterial)[number])) {
        throw new Error("Categoria de material no valida.");
      }

      const unidadBase = linea.newMaterial.unidadBase;
      if (
        unidadBase &&
        !unidadesMaterial.includes(unidadBase as (typeof unidadesMaterial)[number])
      ) {
        throw new Error("Unidad base no valida.");
      }

      const codigo = await nextMaterialCode(categoria);
      const material = await tx.material.create({
        data: {
          codigo,
          nombre: materialNombre,
          categoria,
          unidadBase,
          descripcion: linea.data.descripcion,
        },
        select: { id: true, codigo: true },
      });

      data.push({
        ...linea.data,
        materialId: material.id,
        codigoMaterialDetectado: linea.data.codigoMaterialDetectado || material.codigo,
      });
    } else {
      data.push(linea.data);
    }
  }

  return data;
}

function gastoData(formData: FormData) {
  const proveedor = requiredString(formData, "proveedor");
  const total = requiredOrCalculatedTotal(formData);
  const fecha = optionalDate(formData, "fecha");
  const tipoDocumento = normalizeTipoDocumento(optionalString(formData, "tipoDocumento"));

  if (!total) {
    throw new Error("El total es obligatorio o debe poder calcularse.");
  }

  return {
    tipoGasto: tipoGastoValue(formData),
    proveedor,
    fecha,
    tipoDocumento,
    numeroDocumento: optionalString(formData, "numeroDocumento"),
    categoria: optionValue(optionalString(formData, "categoria"), categoriasGasto, "Otros"),
    baseImponible: optionalDecimal(formData, "baseImponible"),
    iva: optionalDecimal(formData, "iva"),
    total,
    formaPago: optionValue(optionalString(formData, "formaPago"), formasPagoGasto, null),
    descripcion: optionalString(formData, "descripcion"),
    observaciones: optionalString(formData, "observaciones"),
    archivoUrl: optionalString(formData, "archivoUrl"),
    clienteId: optionalClienteId(formData),
  };
}

function lineasData(formData: FormData) {
  if (!isMaterialesTipo(tipoGastoValue(formData))) {
    return [];
  }

  const proveedor = optionalString(formData, "proveedor");
  const useSerreriaFormat = isSerreriaAlmeriense(proveedor);
  const indexes = formData
    .getAll("lineaIndex")
    .filter((value): value is string => typeof value === "string");

  return indexes
    .map((index) => {
      const id = optionalString(formData, `linea-${index}-id`);
      const materialId = optionalString(formData, `linea-${index}-materialId`);
      const codigoMaterialDetectado = normalizeDetectedProviderCode(
        optionalString(formData, `linea-${index}-codigoMaterialDetectado`),
      );
      const descripcion =
        optionalString(formData, `linea-${index}-descripcion`) ?? "Linea pendiente";
      const unidadMedidaProveedor = optionalString(
        formData,
        `linea-${index}-unidadMedidaProveedor`,
      )?.toUpperCase() ?? null;
      const cantidad = useSerreriaFormat
        ? null
        : optionalDecimalFromValue(
            optionalString(formData, `linea-${index}-cantidad`),
            "Cantidad de linea",
          );
      const precioUnitario = useSerreriaFormat
        ? null
        : optionalDecimalFromValue(
            optionalString(formData, `linea-${index}-precioUnitario`),
            "Precio unitario de linea",
          );
      const piezas = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-piezas`),
        "Piezas de linea",
      );
      const medida = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-medida`),
        "Medida de linea",
        3,
      );
      const precioUnidadMedida = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-precioUnidadMedida`),
        "Precio por unidad de medida de linea",
        5,
      );
      const descuentoPorcentaje = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-descuentoPorcentaje`),
        "Descuento de linea",
      ) ?? "0.00";
      const importeManual = optionalDecimalFromValue(
        optionalString(formData, `linea-${index}-importe`),
        "Importe de linea",
      );
      const importe =
        importeManual ??
        (cantidad && precioUnitario
          ? (
              Number(cantidad) *
              Number(precioUnitario) *
              (1 - Number(descuentoPorcentaje) / 100)
            ).toFixed(2)
          : medida && precioUnidadMedida
            ? (
                Number(medida) *
                Number(precioUnidadMedida) *
                (1 - Number(descuentoPorcentaje) / 100)
              ).toFixed(2)
          : null);
      const esPorte =
        optionalBoolean(formData, `linea-${index}-esPorte`) ||
        normalizedText(descripcion).includes("portes");
      const esPendienteServir = optionalBoolean(
        formData,
        `linea-${index}-esPendienteServir`,
      );
      const pedidoProveedor = optionalString(formData, `linea-${index}-pedidoProveedor`);

      if (
        descripcion === "Linea pendiente" &&
        !cantidad &&
        !precioUnitario &&
        !unidadMedidaProveedor &&
        !piezas &&
        !medida &&
        !precioUnidadMedida &&
        !importe &&
        !pedidoProveedor
      ) {
        return null;
      }

      return {
        id,
        newMaterial: {
          nombre: optionalString(formData, `linea-${index}-newMaterialNombre`),
          categoria: optionalString(formData, `linea-${index}-newMaterialCategoria`),
          unidadBase: optionalString(formData, `linea-${index}-newMaterialUnidadBase`),
        },
        data: {
          materialId,
          codigoMaterialDetectado,
          descripcion,
          cantidad,
          precioUnitario,
          unidadMedidaProveedor,
          piezas,
          medida,
          precioUnidadMedida,
          descuentoPorcentaje,
          importe,
          esPorte,
          esPendienteServir,
          pedidoProveedor,
        },
      };
    })
    .filter((linea): linea is NonNullable<typeof linea> => linea !== null);
}

function gastoUploadsDir(uploadId: string) {
  return path.join(uploadsRootDir(), "gastos", uploadId);
}

function gastoUploadUrl(uploadId: string, fileName: string) {
  return `/api/uploads/gastos/${uploadId}/${fileName}`;
}

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "gasto";
}

function requiredDocumentFile(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una imagen o PDF.");
  }

  if (file.size > maxDocumentSize) {
    throw new Error("El archivo no puede superar 20 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const validExtension =
    extension &&
    allowedExtensions.includes(extension as (typeof allowedExtensions)[number]);
  const validMimeType = !file.type || allowedMimeTypes.includes(file.type);
  if (!validExtension || !validMimeType) {
    throw new Error("Solo se aceptan JPG, JPEG, PNG, WEBP o PDF.");
  }

  return { file, extension };
}

async function saveGastoFile(file: File, extension: string) {
  const uploadId = randomUUID();
  const fileName = `${Date.now()}-${safeFileName(file.name)}.${extension}`;
  const uploadDir = gastoUploadsDir(uploadId);
  const filePath = path.join(uploadDir, fileName);
  const archivoUrl = gastoUploadUrl(uploadId, fileName);

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const savedFile = await stat(filePath);
  if (!savedFile.isFile() || savedFile.size === 0) {
    throw new Error("El archivo no se ha guardado correctamente.");
  }

  return { archivoUrl, buffer };
}

function uploadFilePathFromUrl(url: string) {
  const prefix = "/api/uploads/gastos/";
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

function normalizeLineas(input: unknown, proveedorTipoValue: string): GastoLineaAnalizada[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const useCodigoProveedor = proveedorTipoValue === "VERDU";
  const lineas = input.map((linea): GastoLineaAnalizada | null => {
      if (!linea || typeof linea !== "object") {
        return null;
      }

      const record = linea as Partial<Record<keyof GastoLineaAnalizada, unknown>>;
      const value = (key: keyof GastoLineaAnalizada, scale = 2) => {
        const raw = typeof record[key] === "string" ? record[key].trim() : null;
        const parsed = parseDecimalEs(raw, scale);
        return parsed === null ? null : formatDecimalEs(parsed, scale, scale);
      };
      const textValue = (key: keyof GastoLineaAnalizada) =>
        typeof record[key] === "string" ? record[key].trim() : "";
      const boolValue = (key: keyof GastoLineaAnalizada) =>
        typeof record[key] === "boolean" ? record[key] : false;

      const descripcion = textValue("descripcion");
      const codigoInterno = textValue("codigoInterno");
      const cantidad = value("cantidad");
      const precioUnitario = value("precioUnitario");
      const unidadMedidaProveedor = textValue("unidadMedidaProveedor") || null;
      const piezas = value("piezas");
      const medida = value("medida", 3);
      const precioUnidadMedida = value("precioUnidadMedida", 5);
      const descuentoPorcentaje = value("descuentoPorcentaje") ?? "0,00";
      const importe = value("importe");
      const esPorte =
        boolValue("esPorte") || normalizedText(descripcion).includes("portes");
      const esPendienteServir = boolValue("esPendienteServir");
      const pedidoProveedor = textValue("pedidoProveedor") || null;
      const materialId = esPorte ? null : textValue("materialId") || null;
      const detectedCode = textValue("codigoMaterialDetectado") || codigoInterno;
      const codigoMaterialDetectado = esPorte
        ? ""
        : useCodigoProveedor && isInternalMaterialCode(detectedCode)
          ? ""
          : normalizeDetectedProviderCode(detectedCode) ?? "";
      if (
        !descripcion &&
        !cantidad &&
        !precioUnitario &&
        !unidadMedidaProveedor &&
        !piezas &&
        !medida &&
        !precioUnidadMedida &&
        !importe &&
        !pedidoProveedor
      ) {
        return null;
      }

      return {
        codigoInterno,
        descripcion,
        materialId,
        codigoMaterialDetectado,
        cantidad,
        precioUnitario,
        unidadMedidaProveedor,
        piezas,
        medida,
        precioUnidadMedida,
        descuentoPorcentaje,
        importe,
        esPorte,
        esPendienteServir,
        pedidoProveedor,
      };
    });

  return lineas.filter((linea): linea is GastoLineaAnalizada => linea !== null);
}

function normalizeAnalysis(input: Partial<GastoAnalizado>): GastoAnalizado {
  const value = (key: keyof GastoAnalizado) =>
    typeof input[key] === "string" ? input[key]?.trim() ?? "" : "";
  const decimalValue = (key: keyof GastoAnalizado) => {
    const parsed = parseDecimalEs(value(key), 2);
    return parsed === null ? "" : formatDecimalEs(parsed, 2, 2);
  };
  const validTipo = value("tipoDocumento");
  const validCategoria = value("categoria");
  const validProveedorTipo = ["SERRERIA_ALMERIENSE", "VERDU", "GENERICO"].includes(
    value("proveedorTipo"),
  )
    ? value("proveedorTipo")
    : proveedorTipo(value("proveedor"));

  return {
    tipoGasto: tiposGasto.includes(value("tipoGasto") as (typeof tiposGasto)[number])
      ? value("tipoGasto")
      : "Otros",
    proveedorTipo: validProveedorTipo,
    proveedor: value("proveedor"),
    fecha: value("fecha"),
    tipoDocumento: normalizeTipoDocumento(validTipo) ?? "",
    numeroDocumento: value("numeroDocumento"),
    categoria: categoriasGasto.includes(
      validCategoria as (typeof categoriasGasto)[number],
    )
      ? validCategoria
      : "",
    baseImponible: decimalValue("baseImponible"),
    iva: decimalValue("iva"),
    total: decimalValue("total"),
    formaPago: value("formaPago"),
    descripcion: value("descripcion"),
    observaciones: value("observaciones"),
    lineas: normalizeLineas(input.lineas, validProveedorTipo),
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La IA no devolvio un JSON valido.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as Partial<GastoAnalizado>;
}

function collectTextValues(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (
    "type" in value &&
    value.type === "output_text" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return [value.text];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectTextValues);
  }

  return Object.values(value).flatMap(collectTextValues);
}

async function analyzeWithOpenAI(file: File, buffer: Buffer) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no esta configurada.");
  }

  const base64 = buffer.toString("base64");
  const isPdf = file.type === "application/pdf";
  const materialPrefixes = categoriasMaterial
    .map((categoria) => `${categoria}: ${prefijoCategoriaMaterial(categoria)}`)
    .join(", ");
  const materialesExistentes = await prisma.material.findMany({
    orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
    take: 120,
    select: {
      codigo: true,
      nombre: true,
      categoria: true,
    },
  });
  const materialCatalog =
    materialesExistentes.length > 0
      ? materialesExistentes
          .map(
            (material) =>
              `${material.codigo} - ${material.nombre} (${material.categoria ?? "Sin categoria"})`,
          )
          .join("; ")
      : "No hay materiales internos creados todavia.";
  const prompt = `Extrae datos de este documento de compra de Carpinteria Juanser.
Devuelve solo JSON estricto con estas claves: tipoGasto, proveedorTipo, proveedor, fecha, tipoDocumento, numeroDocumento, categoria, baseImponible, iva, total, formaPago, descripcion, observaciones, lineas.
Reglas generales: procesa todas las paginas/hojas del PDF o imagen recibida; si varias paginas pertenecen al mismo albaran o factura, devuelve un unico documento con todas las lineas de todas las paginas en el array lineas. No inventes datos ni completes por intuicion; si un dato no se puede leer con claridad devuelve null en ese campo; fecha en YYYY-MM-DD si aparece; importes como texto decimal; tipoDocumento solo ALBARAN, FACTURA, TICKET u OTRO; si dudas entre albaran y factura devuelve null; categoria solo una de: ${categoriasGasto.join(", ")}; tipoGasto solo uno de: ${tiposGasto.join(", ")}; proveedorTipo solo SERRERIA_ALMERIENSE, VERDU o GENERICO.
Clasificacion tipoGasto: usa Materiales para proveedores de tableros, cantos, herrajes, barnices, ferreteria o compras trazables como articulo interno. Usa Vehículos para combustible, taller o reparación de vehículo. Usa Personal para Seguridad Social, nóminas o personal. Usa Suministros para luz, agua, telefonía o energía. Usa Servicios externos, Alquileres, Impuestos, Herramientas, Maquinaria u Otros cuando corresponda.
Reglas de lineas: si tipoGasto es Materiales, cada articulo o material comprado debe ser un objeto separado en lineas; no concatenes productos en descripcion; si hay 3 articulos devuelve 3 lineas; devuelve en cada linea exactamente estos campos: codigoInterno, codigoMaterialDetectado, materialId, descripcion, cantidad, unidadMedidaProveedor, piezas, medida, precioUnidadMedida, precioUnitario, descuentoPorcentaje, importe, esPorte, esPendienteServir, pedidoProveedor. descuentoPorcentaje debe ser el porcentaje de descuento de linea si aparece, por ejemplo 10 para 10%; si no aparece devuelve null. Si tipoGasto NO es Materiales, devuelve lineas como array vacio.
Reglas de materiales internos: solo si tipoGasto es Materiales y la linea no es porte. No cambies, recortes ni resumas la descripcion original del proveedor. Catalogo interno disponible: ${materialCatalog}. Para cada linea, si reconoces un material parecido del catalogo, rellena codigoInterno con su codigo exacto. Si no hay coincidencia clara, rellena codigoInterno con el prefijo de categoria mas probable; si no puedes deducirlo, devuelve null. Prefijos disponibles: ${materialPrefixes}. Ejemplos: TAB-000001 si coincide un material existente; TAB, CAN, HER, BAR, FER, HER-MAQ u OTR si solo detectas categoria. materialId debe ser null. codigoMaterialDetectado debe conservar el codigo del proveedor cuando el documento tenga una columna o codigo propio; no lo sustituyas por prefijos internos.
Reglas especificas para proveedor Serrería Almeriense o Serreria Almeriense: proveedorTipo=SERRERIA_ALMERIENSE. Mantiene la logica especial: piezas = numero de tableros o unidades fisicas; medida = m2; precioUnidadMedida = precio por m2; importe = medida x precioUnidadMedida. Devuelve cantidad=null, precioUnitario=null y unidadMedidaProveedor=null salvo que aparezca una UM literal. No interpretes Neto como precio por pieza. No devuelvas cantidad=medida ni precioUnitario=piezas. No calcules precioUnitario por tablero salvo que aparezca expresamente. Si Medida x Neto se aproxima a Importe, confirma esa interpretacion. Ejemplo: piezas=4, medida=23.940, precioUnidadMedida=10.384, importe=248.59.
Reglas especificas para proveedor Verdú o Verdu: proveedorTipo=VERDU. Lee la tabla respetando columnas CÓDIGO, DENOMINACIÓN, CANTIDAD, UM, BULTOS, PRECIO, DTO, IMPORTE. Conserva DTO en descuentoPorcentaje. Conserva siempre el CÓDIGO real del proveedor en codigoMaterialDetectado; nunca lo sustituyas por HER, TAB, CAN, FER, OTR, HER-MAQ ni por codigos internos. Para Verdú codigoInterno debe ser null salvo coincidencia interna realmente segura, pero codigoMaterialDetectado debe seguir siendo el codigo del proveedor. La DENOMINACIÓN completa debe ir en descripcion, sin truncar ni resumir. Si la denominacion ocupa varias lineas consecutivas del mismo articulo, unelas en una sola descripcion con espacios manteniendo todo el texto visible. Conserva sufijos finales de descripcion como "6-50 NI", "6-20 NI", "M6-8 ZN" y similares. Prioriza la descripcion completa aunque sea larga. Si UM=CIEN: unidadMedidaProveedor="CIEN", cantidad=valor original, piezas=cantidad*100, precioUnidadMedida=PRECIO, importe=IMPORTE. Si UM=UNID: unidadMedidaProveedor="UNID", cantidad=valor original, piezas=cantidad, precioUnidadMedida=PRECIO, importe=IMPORTE. Para Verdú devuelve precioUnitario=null salvo que el documento tenga una columna claramente de precio unitario distinta de PRECIO. Si descripcion contiene PORTES, esPorte=true, materialId=null, codigoInterno=null y codigoMaterialDetectado=null. Cuando aparezca una linea tipo "** ARTÍCULOS PENDIENTES DE SERVIR..." marca todas las lineas posteriores como esPendienteServir=true hasta que el documento indique otro bloque recibido. Cuando aparezca "N/PEDIDO: XXXXXXX", guarda ese numero en pedidoProveedor para las lineas siguientes hasta el proximo pedido. importeNeto/baseImponible debe coincidir con la suma de importes de lineas no pendientes; guarda baseImponible, iva y total desde el pie del documento si existen. Ejemplo Verdú: 423.33 | TUERCA EMBOLO 2T DOSTE D10-13 M6 ZN | 1,00 | CIEN | 4,77708 | 10 | 4,30 debe salir con codigoMaterialDetectado="423.33", descripcion="TUERCA EMBOLO 2T DOSTE D10-13 M6 ZN", cantidad=1.00, unidadMedidaProveedor=CIEN, piezas=100.00, precioUnidadMedida=4.77708, descuentoPorcentaje=10, importe=4.30.
Reglas para proveedores GENERICO: no fuerces columnas de m2. Usa cantidad, unidadMedidaProveedor, precioUnidadMedida e importe si aparecen; deja piezas y medida en null salvo que sean campos evidentes del documento.`;

  const fileContent = isPdf
    ? {
        type: "input_file",
        filename: file.name,
        file_data: `data:application/pdf;base64,${base64}`,
      }
    : {
        type: "input_image",
        image_url: `data:${file.type || "image/jpeg"};base64,${base64}`,
      };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_GASTOS_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }, fileContent],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gasto_documento",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              proveedor: { type: ["string", "null"] },
              proveedorTipo: { type: ["string", "null"] },
              tipoGasto: { type: ["string", "null"] },
              fecha: { type: ["string", "null"] },
              tipoDocumento: { type: ["string", "null"] },
              numeroDocumento: { type: ["string", "null"] },
              categoria: { type: ["string", "null"] },
              baseImponible: { type: ["string", "null"] },
              iva: { type: ["string", "null"] },
              total: { type: ["string", "null"] },
              formaPago: { type: ["string", "null"] },
              descripcion: { type: ["string", "null"] },
              observaciones: { type: ["string", "null"] },
              lineas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    materialId: { type: ["string", "null"] },
                    codigoInterno: { type: ["string", "null"] },
                    codigoMaterialDetectado: { type: ["string", "null"] },
                    descripcion: { type: ["string", "null"] },
                    cantidad: { type: ["string", "null"] },
                    precioUnitario: { type: ["string", "null"] },
                    unidadMedidaProveedor: { type: ["string", "null"] },
                    piezas: { type: ["string", "null"] },
                    medida: { type: ["string", "null"] },
                    precioUnidadMedida: { type: ["string", "null"] },
                    descuentoPorcentaje: { type: ["string", "null"] },
                    importe: { type: ["string", "null"] },
                    esPorte: { type: "boolean" },
                    esPendienteServir: { type: "boolean" },
                    pedidoProveedor: { type: ["string", "null"] },
                  },
                  required: [
                    "materialId",
                    "codigoInterno",
                    "codigoMaterialDetectado",
                    "descripcion",
                    "cantidad",
                    "precioUnitario",
                    "unidadMedidaProveedor",
                    "piezas",
                    "medida",
                    "precioUnidadMedida",
                    "descuentoPorcentaje",
                    "importe",
                    "esPorte",
                    "esPendienteServir",
                    "pedidoProveedor",
                  ],
                },
              },
            },
            required: [
              "proveedor",
              "proveedorTipo",
              "tipoGasto",
              "fecha",
              "tipoDocumento",
              "numeroDocumento",
              "categoria",
              "baseImponible",
              "iva",
              "total",
              "formaPago",
              "descripcion",
              "observaciones",
              "lineas",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI no pudo analizar el documento: ${errorText}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  const outputText = payload.output_text ?? collectTextValues(payload)[0];
  if (!outputText) {
    throw new Error("La IA no devolvio contenido legible.");
  }

  return normalizeAnalysis(extractJson(outputText));
}

export async function analizarDocumentoGasto(
  _state: AnalizarGastoState,
  formData: FormData,
): Promise<AnalizarGastoState> {
  try {
    const { file, extension } = requiredDocumentFile(formData);
    const { archivoUrl, buffer } = await saveGastoFile(file, extension);

    try {
      const data = await analyzeWithOpenAI(file, buffer);
      return {
        status: "success",
        message: "Documento analizado. Revisa los datos antes de guardar.",
        archivoUrl,
        fileName: file.name,
        mimeType: file.type || null,
        data,
      };
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? `${error.message} Puedes completar el formulario manualmente.`
            : "No se pudo analizar el documento. Puedes completar el formulario manualmente.",
        archivoUrl,
        fileName: file.name,
        mimeType: file.type || null,
        data: emptyGastoAnalizado,
      };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo subir el documento.",
      archivoUrl: null,
      fileName: null,
      mimeType: null,
      data: emptyGastoAnalizado,
    };
  }
}

export async function createGasto(
  _state: GastoFormState,
  formData: FormData,
): Promise<GastoFormState> {
  let gastoId: string | null = null;
  try {
    const lineas = lineasData(formData);
    const gastoInput = gastoData(formData);
    const gasto = await prisma.$transaction(async (tx) => {
      const lineasCreate = await lineasCreateData(lineas, tx);
      const numeroInterno = await nextNumeroInterno(tx, gastoInput.tipoDocumento);

      return tx.gasto.create({
        data: {
          ...gastoInput,
          numeroInterno,
          lineas:
            lineasCreate.length > 0
              ? {
                  create: lineasCreate,
                }
              : undefined,
        },
      });
    });
    gastoId = gasto.id;

    revalidatePath("/");
    revalidatePath("/gastos");
    revalidatePath("/materiales");
    revalidatePath("/materiales/buscar");
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No se pudo guardar el gasto.",
    };
  }

  redirect(`/gastos/${gastoId}`);
}

export async function updateGasto(
  _state: GastoFormState,
  formData: FormData,
): Promise<GastoFormState> {
  let gastoId: string | null = null;
  try {
    const id = requiredGastoId(formData);
    gastoId = id;
    const gastoInput = gastoData(formData);
    const lineas = lineasData(formData);
    await prisma.$transaction(async (tx) => {
      const existingGasto = await tx.gasto.findUnique({
        where: { id },
        select: { numeroInterno: true },
      });
      if (!existingGasto) {
        throw new Error("Gasto no encontrado.");
      }
      const numeroInterno =
        existingGasto.numeroInterno ??
        (await nextNumeroInterno(tx, gastoInput.tipoDocumento));

      await tx.gasto.update({
        where: { id },
        data: {
          ...gastoInput,
          numeroInterno,
        },
      });

      if (isMaterialesTipo(gastoInput.tipoGasto)) {
        const existing = await tx.gastoLinea.findMany({
          where: { gastoId: id },
          select: { id: true },
        });
        const submittedIds = new Set(
          lineas
            .map((linea) => linea.id)
            .filter((lineaId): lineaId is string => Boolean(lineaId)),
        );
        const idsToDelete = existing
          .map((linea) => linea.id)
          .filter((lineaId) => !submittedIds.has(lineaId));

        if (idsToDelete.length > 0) {
          await tx.gastoLinea.deleteMany({
            where: { id: { in: idsToDelete }, gastoId: id },
          });
        }

        for (const linea of lineas) {
          const [lineaInput] = await lineasCreateData([linea], tx);
          if (linea.id) {
            await tx.gastoLinea.updateMany({
              where: { id: linea.id, gastoId: id },
              data: lineaInput,
            });
          } else {
            await tx.gastoLinea.create({
              data: {
                gastoId: id,
                ...lineaInput,
              },
            });
          }
        }
      } else {
        await tx.gastoLinea.deleteMany({
          where: { gastoId: id },
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/gastos");
    revalidatePath("/materiales");
    revalidatePath("/materiales/buscar");
    revalidatePath(`/gastos/${id}`);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No se pudo actualizar el gasto.",
    };
  }

  redirect(`/gastos/${gastoId}`);
}

export async function deleteGasto(formData: FormData) {
  const id = requiredGastoId(formData);
  const gasto = await prisma.gasto.findUnique({
    where: { id },
    select: { id: true, archivoUrl: true },
  });
  if (!gasto) {
    throw new Error("Gasto no encontrado.");
  }

  if (gasto.archivoUrl) {
    const usos = await prisma.gasto.count({
      where: {
        archivoUrl: gasto.archivoUrl,
        NOT: { id },
      },
    });
    const filePath = usos === 0 ? uploadFilePathFromUrl(gasto.archivoUrl) : null;
    if (filePath) {
      await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }
  }

  await prisma.gasto.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/gastos");
  redirect("/gastos");
}

export async function asignarMaterialGastoLinea(
  _state: MaterialLineaState,
  formData: FormData,
): Promise<MaterialLineaState> {
  try {
    const { gastoId, lineaId } = requiredLineaMaterialIds(formData);
    const materialId = requiredString(formData, "materialId");
    const gasto = await prisma.gasto.findUnique({
      where: { id: gastoId },
      select: { tipoGasto: true },
    });
    if (!gasto || !isMaterialesTipo(gasto.tipoGasto)) {
      throw new Error("Solo los gastos de tipo Materiales permiten vincular materiales.");
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true, codigo: true, nombre: true },
    });
    if (!material) {
      throw new Error("Material no encontrado.");
    }

    const result = await prisma.gastoLinea.updateMany({
      where: { id: lineaId, gastoId },
      data: {
        materialId: material.id,
        codigoMaterialDetectado: material.codigo,
      },
    });
    if (result.count === 0) {
      throw new Error("Linea de gasto no encontrada.");
    }

    revalidatePath(`/gastos/${gastoId}`);
    revalidatePath(`/gastos/${gastoId}/editar`);
    revalidatePath("/materiales");
    revalidatePath("/materiales/buscar");
    revalidatePath(`/materiales/${material.id}`);

    return {
      status: "success",
      message: `Material asignado: ${material.codigo} · ${material.nombre}`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No se pudo asignar el material.",
    };
  }
}

export async function crearYAsignarMaterialGastoLinea(
  _state: MaterialLineaState,
  formData: FormData,
): Promise<MaterialLineaState> {
  try {
    const { gastoId, lineaId } = requiredLineaMaterialIds(formData);
    const gasto = await prisma.gasto.findUnique({
      where: { id: gastoId },
      select: { tipoGasto: true },
    });
    if (!gasto || !isMaterialesTipo(gasto.tipoGasto)) {
      throw new Error("Solo los gastos de tipo Materiales permiten vincular materiales.");
    }

    const categoria = categoriaMaterialValue(formData);
    const codigo = await nextMaterialCode(categoria);

    const material = await prisma.$transaction(async (tx) => {
      const createdMaterial = await tx.material.create({
        data: {
          codigo,
          nombre: requiredString(formData, "nombre"),
          categoria,
          unidadBase: unidadBaseMaterialValue(formData),
          descripcion: optionalString(formData, "descripcion"),
        },
        select: { id: true, codigo: true, nombre: true },
      });

      const result = await tx.gastoLinea.updateMany({
        where: { id: lineaId, gastoId },
        data: {
          materialId: createdMaterial.id,
          codigoMaterialDetectado: createdMaterial.codigo,
        },
      });
      if (result.count === 0) {
        throw new Error("Linea de gasto no encontrada.");
      }

      return createdMaterial;
    });

    revalidatePath(`/gastos/${gastoId}`);
    revalidatePath(`/gastos/${gastoId}/editar`);
    revalidatePath("/materiales");
    revalidatePath("/materiales/buscar");
    revalidatePath(`/materiales/${material.id}`);

    return {
      status: "success",
      message: `Material creado y asignado: ${material.codigo} · ${material.nombre}`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear y asignar el material.",
    };
  }
}
