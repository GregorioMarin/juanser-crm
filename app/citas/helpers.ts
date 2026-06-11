export const citaEstados = [
  "PENDIENTE",
  "CONFIRMADA",
  "CANCELADA",
  "REALIZADA",
] as const;

export type CitaEstadoNormalizado = (typeof citaEstados)[number];

export const servicioPrefix = "Servicio:";

const citaEstadoMap: Record<string, CitaEstadoNormalizado> = {
  pending: "PENDIENTE",
  pendiente: "PENDIENTE",
  pendientes: "PENDIENTE",
  approved: "CONFIRMADA",
  approve: "CONFIRMADA",
  confirmed: "CONFIRMADA",
  confirmada: "CONFIRMADA",
  confirmado: "CONFIRMADA",
  confirmadas: "CONFIRMADA",
  booked: "CONFIRMADA",
  scheduled: "CONFIRMADA",
  canceled: "CANCELADA",
  cancelled: "CANCELADA",
  cancelada: "CANCELADA",
  cancelado: "CANCELADA",
  rejected: "CANCELADA",
  completed: "REALIZADA",
  complete: "REALIZADA",
  realizada: "REALIZADA",
  realizado: "REALIZADA",
  done: "REALIZADA",
};

export function normalizeCitaEstado(
  value: unknown,
  fallback: CitaEstadoNormalizado = "CONFIRMADA",
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return citaEstadoMap[normalized] ?? fallback;
}

export function isCitaPendienteOFutura({
  estado,
  fechaHora,
  now = new Date(),
}: {
  estado: CitaEstadoNormalizado;
  fechaHora: Date;
  now?: Date;
}) {
  return estado === "PENDIENTE" || (estado === "CONFIRMADA" && fechaHora >= now);
}

export function isCitasPendientesFilter(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "pendientes" || raw === "1" || raw === "true";
}

export function citaLines(nota: string | null | undefined) {
  return nota?.split("\n").map((line) => line.trim()).filter(Boolean) ?? [];
}

export function citaServicio(nota: string | null | undefined) {
  const serviceLine = citaLines(nota).find((line) => line.startsWith(servicioPrefix));

  return serviceLine?.slice(servicioPrefix.length).trim() || null;
}

export function citaNotaVisible(
  nota: string | null | undefined,
  hiddenLines: string[] = [],
) {
  const visible = citaLines(nota)
    .filter((line) => !line.startsWith(servicioPrefix))
    .filter((line) => !hiddenLines.includes(line))
    .join("\n");

  return visible || null;
}

export function buildCitaNota({
  servicio,
  nota,
  preservedLines = [],
}: {
  servicio: string | null;
  nota: string | null;
  preservedLines?: string[];
}) {
  return [
    servicio ? `${servicioPrefix} ${servicio}` : null,
    nota,
    ...preservedLines,
  ]
    .filter(Boolean)
    .join("\n") || null;
}
