import { prisma } from "@/app/lib/prisma";

export function citasPendientesWhere(now = new Date()) {
  return {
    OR: [
      { estado: "PENDIENTE" as const },
      {
        estado: "CONFIRMADA" as const,
        fechaHora: { gte: now },
      },
    ],
  };
}

export async function getCitas({ pendientes = false } = {}) {
  return prisma.cita.findMany({
    where: pendientes ? citasPendientesWhere() : undefined,
    orderBy: { fechaHora: "asc" },
  });
}

export async function countCitasPendientes() {
  return prisma.cita.count({
    where: citasPendientesWhere(),
  });
}
