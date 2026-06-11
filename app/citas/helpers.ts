export const citaEstados = [
  "PENDIENTE",
  "CONFIRMADA",
  "CANCELADA",
  "REALIZADA",
] as const;

export type CitaEstadoNormalizado = (typeof citaEstados)[number];

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
