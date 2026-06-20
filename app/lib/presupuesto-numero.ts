import { prisma } from "@/app/lib/prisma";

const prefix = "PJ";
const padding = 4;
export const presupuestoNumeroLockKey = 2026060801;

function incrementNumero(numero: string | null, fecha: Date) {
  const yearPrefix = `${prefix}-${fecha.getFullYear()}-`;
  const suffix = numero?.match(/(\d+)$/)?.[1];
  const next = suffix ? Number(suffix) + 1 : 1;

  return `${yearPrefix}${String(next).padStart(
    Math.max(padding, suffix?.length ?? 0),
    "0",
  )}`;
}

export async function generatePresupuestoNumero(
  fecha: Date,
  tx: Pick<typeof prisma, "presupuesto"> = prisma,
) {
  const last = await tx.presupuesto.findFirst({
    orderBy: { id: "desc" },
    select: { numero: true },
  });

  return incrementNumero(last?.numero ?? null, fecha);
}
