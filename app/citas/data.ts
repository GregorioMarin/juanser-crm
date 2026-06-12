import { prisma } from "@/app/lib/prisma";
import { citaEstadosPendientes } from "./helpers";

export function citasPendientesWhere(now = new Date()) {
  const where = {
    estado: { in: [...citaEstadosPendientes] },
    fechaHora: { gte: now },
  };

  console.info("[citasPendientesWhere]", {
    nowIso: now.toISOString(),
    nowLocal: now.toString(),
    where,
  });

  return where;
}

export async function getCitas({ pendientes = false } = {}) {
  return prisma.cita.findMany({
    where: pendientes ? citasPendientesWhere() : undefined,
    orderBy: { fechaHora: "asc" },
  });
}

export async function countCitasPendientes() {
  const now = new Date();
  const wherePendientes = citasPendientesWhere(now);
  const [
    totalCitas,
    totalFuturas,
    totalPendiente,
    totalConfirmada,
    distribucionPorEstado,
    proximasCitas,
    citasPendientes,
  ] =
    await Promise.all([
      prisma.cita.count(),
      prisma.cita.count({
        where: { fechaHora: { gte: now } },
      }),
      prisma.cita.count({
        where: { fechaHora: { gte: now }, estado: "PENDIENTE" },
      }),
      prisma.cita.count({
        where: { fechaHora: { gte: now }, estado: "CONFIRMADA" },
      }),
      prisma.cita.groupBy({
        by: ["estado"],
        _count: { _all: true },
        orderBy: { estado: "asc" },
      }),
      prisma.cita.findMany({
        where: { fechaHora: { gte: now } },
        orderBy: { fechaHora: "asc" },
        take: 10,
        select: {
          id: true,
          clienteNombre: true,
          estado: true,
          fechaHora: true,
        },
      }),
      prisma.cita.findMany({
        where: wherePendientes,
        orderBy: { fechaHora: "asc" },
        select: {
          id: true,
          clienteNombre: true,
          estado: true,
          fechaHora: true,
        },
      }),
    ]);

  console.info("[countCitasPendientes:diagnostico]", {
    nowIso: now.toISOString(),
    nowLocal: now.toString(),
    wherePendientes,
    totalCitas,
    totalCitasFuturas: totalFuturas,
    totalPendiente,
    totalConfirmada,
    distribucionPorEstado: distribucionPorEstado.map((item) => ({
      estado: item.estado,
      total: item._count._all,
    })),
    proximas10Citas: proximasCitas.map((cita) => ({
      id: cita.id,
      nombre: cita.clienteNombre,
      estado: cita.estado,
      fechaHoraIso: cita.fechaHora.toISOString(),
      fechaHoraLocal: cita.fechaHora.toString(),
    })),
    resultadoQueryPendientes: {
      total: citasPendientes.length,
      citas: citasPendientes.map((cita) => ({
        id: cita.id,
        nombre: cita.clienteNombre,
        estado: cita.estado,
        fechaHoraIso: cita.fechaHora.toISOString(),
        fechaHoraLocal: cita.fechaHora.toString(),
      })),
    },
    totalExcluidas: totalFuturas - citasPendientes.length,
    motivoExclusion: "Cita futura con estado distinto de PENDIENTE/CONFIRMADA",
  });

  return citasPendientes.length;
}
