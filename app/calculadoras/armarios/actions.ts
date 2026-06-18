"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

const standardBoardArea = 2.44 * 1.22;
const tipoPuertasOptions = ["abatibles", "correderas", "sin puertas"] as const;
const tipoTraseraOptions = ["sin trasera", "3 mm", "10 mm", "16 mm"] as const;
const materialOptions = ["MDF", "melamina", "rechapado", "contrachapado"] as const;
const grosorOptions = [16, 19, 22, 30] as const;

export type CalculoArmarioInput = {
  anchoCm: number;
  altoCm: number;
  fondoCm: number;
  tipoPuertas: string;
  numeroPuertas: number;
  numeroModulos: number;
  numeroCajones: number;
  numeroBaldas: number;
  numeroBarras: number;
  tipoTrasera: string;
  materialPrincipal: string;
  grosorPrincipalMm: number;
  observaciones: string;
};

export type CalculoArmarioResult = {
  metrosFrontales: number;
  metrosTableroPrincipal: number;
  tablerosPrincipales: number;
  metrosTrasera: number;
  tablerosTrasera: number;
  metrosCanto: number;
  bisagras: number;
  guiasCajon: number;
  metrosBarra: number;
  complejidad: string;
};

export type CalculoArmarioState = {
  status: "idle" | "success" | "error";
  message: string | null;
  saved?: {
    id: number;
    fecha: string;
    anchoCm: number;
    altoCm: number;
    fondoCm: number;
    tipoPuertas: string;
    numeroPuertas: number;
    numeroModulos: number;
    numeroCajones: number;
    numeroBaldas: number;
    numeroBarras: number;
    tipoTrasera: string;
    materialPrincipal: string;
    grosorPrincipalMm: number;
    observaciones: string | null;
    metrosFrontales: number;
    metrosTableroPrincipal: number;
    tablerosPrincipales: number;
    metrosTrasera: number;
    tablerosTrasera: number;
    metrosCanto: number;
    bisagras: number;
    guiasCajon: number;
    metrosBarra: number;
    complejidad: string;
  };
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeInteger(value: unknown) {
  return Math.trunc(normalizeNumber(value));
}

function validateInput(input: CalculoArmarioInput) {
  const data = {
    anchoCm: normalizeNumber(input.anchoCm),
    altoCm: normalizeNumber(input.altoCm),
    fondoCm: normalizeNumber(input.fondoCm),
    tipoPuertas: input.tipoPuertas,
    numeroPuertas: normalizeInteger(input.numeroPuertas),
    numeroModulos: normalizeInteger(input.numeroModulos),
    numeroCajones: normalizeInteger(input.numeroCajones),
    numeroBaldas: normalizeInteger(input.numeroBaldas),
    numeroBarras: normalizeInteger(input.numeroBarras),
    tipoTrasera: input.tipoTrasera,
    materialPrincipal: input.materialPrincipal,
    grosorPrincipalMm: normalizeInteger(input.grosorPrincipalMm),
    observaciones: input.observaciones?.trim() ?? "",
  };

  if (data.anchoCm <= 0 || data.altoCm <= 0 || data.fondoCm <= 0) {
    throw new Error("Ancho, alto y fondo son obligatorios y deben ser mayores que 0.");
  }

  const countFields = [
    data.numeroPuertas,
    data.numeroModulos,
    data.numeroCajones,
    data.numeroBaldas,
    data.numeroBarras,
  ];
  if (countFields.some((value) => value < 0)) {
    throw new Error("Los contadores no pueden ser negativos.");
  }

  if (data.numeroModulos < 1) {
    throw new Error("El numero de modulos debe ser mayor que 0.");
  }

  if (!tipoPuertasOptions.includes(data.tipoPuertas as (typeof tipoPuertasOptions)[number])) {
    throw new Error("Tipo de puertas no valido.");
  }

  if (!tipoTraseraOptions.includes(data.tipoTrasera as (typeof tipoTraseraOptions)[number])) {
    throw new Error("Tipo de trasera no valido.");
  }

  if (!materialOptions.includes(data.materialPrincipal as (typeof materialOptions)[number])) {
    throw new Error("Material principal no valido.");
  }

  if (!grosorOptions.includes(data.grosorPrincipalMm as (typeof grosorOptions)[number])) {
    throw new Error("Grosor principal no valido.");
  }

  if (data.tipoPuertas === "sin puertas" && data.numeroPuertas !== 0) {
    throw new Error("Si el armario no lleva puertas, el numero de puertas debe ser 0.");
  }

  if (data.tipoPuertas !== "sin puertas" && data.numeroPuertas <= 0) {
    throw new Error("Si hay puertas, el numero de puertas debe ser mayor que 0.");
  }

  return data;
}

function calculate(input: CalculoArmarioInput): CalculoArmarioResult {
  const data = validateInput(input);
  const anchoM = data.anchoCm / 100;
  const altoM = data.altoCm / 100;
  const fondoM = data.fondoCm / 100;
  const moduloAnchoM = anchoM / data.numeroModulos;
  const metrosFrontales = anchoM * altoM;
  const laterales = 2 * altoM * fondoM;
  const techoSuelo = 2 * anchoM * fondoM;
  const divisiones = Math.max(data.numeroModulos - 1, 0) * altoM * fondoM;
  const puertas = data.tipoPuertas === "sin puertas" ? 0 : metrosFrontales;
  const baldas = data.numeroBaldas * moduloAnchoM * fondoM;
  const cajonesPrincipal =
    data.numeroCajones * (2 * fondoM * 0.2 + 2 * moduloAnchoM * 0.2);
  const tableroSinMerma =
    laterales + techoSuelo + divisiones + puertas + baldas + cajonesPrincipal;
  const metrosTableroPrincipal = tableroSinMerma * 1.15;
  const metrosTrasera = data.tipoTrasera === "sin trasera" ? 0 : metrosFrontales;
  const cantoCasco = 2 * altoM + 2 * anchoM + Math.max(data.numeroModulos - 1, 0) * altoM;
  const cantoBaldas = data.numeroBaldas * moduloAnchoM;
  const cantoPuertas =
    data.tipoPuertas === "sin puertas"
      ? 0
      : data.numeroPuertas * 2 * (anchoM / data.numeroPuertas + altoM);
  const cantoCajones = data.numeroCajones * 2 * (moduloAnchoM + 0.2);
  const metrosCanto = cantoCasco + cantoBaldas + cantoPuertas + cantoCajones;
  const bisagras = data.tipoPuertas === "abatibles" ? data.numeroPuertas * 4 : 0;
  const guiasCajon = data.numeroCajones;
  const metrosBarra = data.numeroBarras * moduloAnchoM;
  const complejidad =
    metrosFrontales > 6 ||
    data.numeroCajones >= 6 ||
    data.numeroPuertas >= 4 ||
    data.tipoPuertas === "correderas"
      ? "alta"
      : metrosFrontales > 3 ||
          data.numeroCajones > 2 ||
          data.numeroBaldas > 4 ||
          data.numeroBarras > 2 ||
          data.numeroModulos > 2
        ? "media"
        : "baja";

  return {
    metrosFrontales: round(metrosFrontales, 3),
    metrosTableroPrincipal: round(metrosTableroPrincipal, 3),
    tablerosPrincipales: Math.ceil(metrosTableroPrincipal / standardBoardArea),
    metrosTrasera: round(metrosTrasera, 3),
    tablerosTrasera: Math.ceil(metrosTrasera / standardBoardArea),
    metrosCanto: round(metrosCanto, 2),
    bisagras,
    guiasCajon,
    metrosBarra: round(metrosBarra, 2),
    complejidad,
  };
}

export async function saveCalculoArmario(
  input: CalculoArmarioInput,
): Promise<CalculoArmarioState> {
  try {
    const data = validateInput(input);
    const result = calculate(input);

    const saved = await prisma.calculoArmario.create({
      data: {
        ...data,
        observaciones: data.observaciones || null,
        metrosFrontales: result.metrosFrontales,
        metrosTableroPrincipal: result.metrosTableroPrincipal,
        tablerosPrincipales: result.tablerosPrincipales,
        metrosTrasera: result.metrosTrasera,
        tablerosTrasera: result.tablerosTrasera,
        metrosCanto: result.metrosCanto,
        bisagras: result.bisagras,
        guiasCajon: result.guiasCajon,
        metrosBarra: result.metrosBarra,
        complejidad: result.complejidad,
      },
    });

    revalidatePath("/calculadoras/armarios");

    return {
      status: "success",
      message: "Calculo de armario guardado.",
      saved: {
        id: saved.id,
        fecha: saved.fecha.toISOString(),
        anchoCm: Number(saved.anchoCm.toString()),
        altoCm: Number(saved.altoCm.toString()),
        fondoCm: Number(saved.fondoCm.toString()),
        tipoPuertas: saved.tipoPuertas,
        numeroPuertas: saved.numeroPuertas,
        numeroModulos: saved.numeroModulos,
        numeroCajones: saved.numeroCajones,
        numeroBaldas: saved.numeroBaldas,
        numeroBarras: saved.numeroBarras,
        tipoTrasera: saved.tipoTrasera,
        materialPrincipal: saved.materialPrincipal,
        grosorPrincipalMm: saved.grosorPrincipalMm,
        observaciones: saved.observaciones,
        metrosFrontales: Number(saved.metrosFrontales.toString()),
        metrosTableroPrincipal: Number(saved.metrosTableroPrincipal.toString()),
        tablerosPrincipales: saved.tablerosPrincipales,
        metrosTrasera: Number(saved.metrosTrasera.toString()),
        tablerosTrasera: saved.tablerosTrasera,
        metrosCanto: Number(saved.metrosCanto.toString()),
        bisagras: saved.bisagras,
        guiasCajon: saved.guiasCajon,
        metrosBarra: Number(saved.metrosBarra.toString()),
        complejidad: saved.complejidad,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el calculo.",
    };
  }
}

export async function deleteCalculoArmario(id: number) {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Calculo no valido.");
  }

  await prisma.calculoArmario.delete({ where: { id } });
  revalidatePath("/calculadoras/armarios");
}
