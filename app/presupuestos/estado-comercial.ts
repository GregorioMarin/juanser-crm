import type { Prisma } from "@/app/generated/prisma/client";

export const presupuestoFiltrosComerciales = [
  "PENDIENTE_RESPUESTA",
  "ACEPTADO",
  "RECHAZADO",
] as const;

export type PresupuestoFiltroComercial =
  (typeof presupuestoFiltrosComerciales)[number];

export function presupuestoFiltroComercialWhere(
  filtro: PresupuestoFiltroComercial | null,
): Prisma.PresupuestoWhereInput {
  if (filtro === "PENDIENTE_RESPUESTA") {
    return {
      cliente: { id: { gt: 0 }, estado: { notIn: ["ACEPTADO", "PERDIDO"] } },
      estado: { notIn: ["ACEPTADO", "INSTALADO"] },
    };
  }

  if (filtro === "ACEPTADO") {
    return { cliente: { id: { gt: 0 }, estado: "ACEPTADO" } };
  }

  if (filtro === "RECHAZADO") {
    return { cliente: { id: { gt: 0 }, estado: "PERDIDO" } };
  }

  return { cliente: { id: { gt: 0 } } };
}

export function presupuestoPendienteRespuestaWhere() {
  return presupuestoFiltroComercialWhere("PENDIENTE_RESPUESTA");
}

export function presupuestoFiltroComercialLabel(
  filtro: PresupuestoFiltroComercial,
) {
  const labels: Record<PresupuestoFiltroComercial, string> = {
    PENDIENTE_RESPUESTA: "Pendiente de respuesta",
    ACEPTADO: "Aceptado",
    RECHAZADO: "Rechazado",
  };

  return labels[filtro];
}
