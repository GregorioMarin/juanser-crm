import type {
  FrecuenciaVencimiento,
  Prisma,
} from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";

const MONTHS_BY_FREQUENCY: Partial<Record<FrecuenciaVencimiento, number>> = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

type Rule = {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  proveedor: string | null;
  titularGastoId: number | null;
  importeEstimado: Prisma.Decimal;
  frecuencia: FrecuenciaVencimiento;
  intervalo: number;
  diaMes: number | null;
  mesAplicable: number | null;
  fechaInicio: Date;
  fechaFin: Date | null;
};

function utcDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function firstOccurrence(rule: Rule) {
  const start = rule.fechaInicio;
  if (rule.frecuencia === "SEMANAL") {
    return new Date(Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    ));
  }

  const day = rule.diaMes ?? start.getUTCDate();
  let year = start.getUTCFullYear();
  let month = rule.mesAplicable ? rule.mesAplicable - 1 : start.getUTCMonth();
  let candidate = utcDate(year, month, day);

  if (candidate < start) {
    if (rule.mesAplicable) {
      year += 1;
    } else {
      month += MONTHS_BY_FREQUENCY[rule.frecuencia] ?? 1;
    }
    candidate = utcDate(year, month, day);
  }

  return candidate;
}

function occurrenceAt(rule: Rule, first: Date, index: number) {
  if (rule.frecuencia === "SEMANAL") {
    const result = new Date(first);
    result.setUTCDate(first.getUTCDate() + index * 7 * rule.intervalo);
    return result;
  }

  const monthStep = (MONTHS_BY_FREQUENCY[rule.frecuencia] ?? 1) * rule.intervalo;
  const absoluteMonth = first.getUTCFullYear() * 12 + first.getUTCMonth() + index * monthStep;
  return utcDate(
    Math.floor(absoluteMonth / 12),
    absoluteMonth % 12,
    rule.diaMes ?? rule.fechaInicio.getUTCDate(),
  );
}

function datesUntil(rule: Rule, horizon: Date) {
  const dates: Date[] = [];
  const first = firstOccurrence(rule);
  const limit = rule.fechaFin && rule.fechaFin < horizon ? rule.fechaFin : horizon;

  for (let index = 0; index < 10_000; index += 1) {
    const occurrence = occurrenceAt(rule, first, index);
    if (occurrence > limit) break;
    if (occurrence >= rule.fechaInicio) dates.push(occurrence);
  }

  return dates;
}

export function recurrenceHorizon(from = new Date(), months = 12) {
  return new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth() + months,
    from.getUTCDate(),
  ));
}

export async function generateVencimientosHasta(
  horizon = recurrenceHorizon(),
  recurrenteIds?: string[],
) {
  return prisma.$transaction(async (tx) => {
    const rules = await tx.vencimientoRecurrente.findMany({
      where: {
        activo: true,
        fechaInicio: { lte: horizon },
        OR: [{ fechaFin: null }, { fechaFin: { gte: new Date(0) } }],
        ...(recurrenteIds ? { id: { in: recurrenteIds } } : {}),
      },
    });
    let created = 0;

    for (const rule of rules) {
      const dates = datesUntil(rule, horizon);
      if (dates.length > 0) {
        const result = await tx.vencimiento.createMany({
          data: dates.map((fechaVencimiento) => ({
            recurrenteId: rule.id,
            titulo: rule.titulo,
            descripcion: rule.descripcion,
            categoria: rule.categoria,
            proveedor: rule.proveedor,
            titularGastoId: rule.titularGastoId,
            importe: rule.importeEstimado,
            fechaVencimiento,
            origen: "RECURRENTE" as const,
          })),
          skipDuplicates: true,
        });
        created += result.count;
      }

      const coveredUntil = rule.fechaFin && rule.fechaFin < horizon
        ? rule.fechaFin
        : horizon;
      await tx.vencimientoRecurrente.update({
        where: { id: rule.id },
        data: { ultimoGeneradoHasta: coveredUntil },
      });
    }

    return created;
  });
}
