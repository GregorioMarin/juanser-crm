import { prisma } from "@/app/lib/prisma";
import { clienteCreadoMarker } from "./constants";
import { citaEstadosPendientes } from "./helpers";

export function citasPendientesWhere(now = new Date()) {
  return {
    estado: { in: [...citaEstadosPendientes] },
    fechaHora: { gte: now },
    OR: [
      { nota: null },
      {
        NOT: {
          nota: { contains: clienteCreadoMarker },
        },
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
