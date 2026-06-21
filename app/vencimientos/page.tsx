import Link from "next/link";
import { connection } from "next/server";
import type { EstadoVencimiento, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { estadoLabels, origenLabels } from "@/app/vencimientos/constants";
import { formatDate, formatMoney } from "@/app/vencimientos/format";
import { generateVencimientosHasta } from "@/app/vencimientos/recurrence";
import { VencimientoActions } from "@/app/vencimientos/vencimiento-actions";

const estadoStyles = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  PAGADO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-neutral-200 text-neutral-700",
} as const;

export default async function VencimientosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await connection();
  await generateVencimientosHasta();
  const { estado: rawEstado } = await searchParams;
  const estado = (["PENDIENTE", "PAGADO", "CANCELADO"] as const).includes(rawEstado as EstadoVencimiento)
    ? rawEstado as EstadoVencimiento
    : undefined;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const inThirtyDays = new Date(today);
  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);
  const where: Prisma.VencimientoWhereInput = estado ? { estado } : {};
  const [records, proximos, pendientes, recurrentesActivos] = await Promise.all([
    prisma.vencimiento.findMany({
      where,
      orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "asc" }],
      include: { titularGasto: { select: { nombre: true } } },
      take: 500,
    }),
    prisma.vencimiento.count({ where: { estado: "PENDIENTE", fechaVencimiento: { gte: today, lte: inThirtyDays } } }),
    prisma.vencimiento.count({ where: { estado: "PENDIENTE" } }),
    prisma.vencimientoRecurrente.count({ where: { activo: true } }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/gastos" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Ir a Gastos y Compras</Link>
            <h1 className="mt-3 text-3xl font-semibold">Vencimientos</h1>
            <p className="mt-2 text-sm text-neutral-600">Agenda de pagos puntuales y recurrentes, separada del registro contable de gastos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/vencimientos/recurrentes" className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-emerald-700 hover:bg-neutral-50">Gestionar recurrentes</Link>
            <Link href="/vencimientos/nuevo" className="inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Nuevo manual</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Próximos 30 días</p><p className="mt-2 text-3xl font-semibold">{proximos}</p></div>
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Recurrentes activos</p><p className="mt-2 text-3xl font-semibold">{recurrentesActivos}</p></div>
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pendientes de pago</p><p className="mt-2 text-3xl font-semibold">{pendientes}</p></div>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
          {[{ href: "/vencimientos", label: "Todos" }, { href: "/vencimientos?estado=PENDIENTE", label: "Pendientes" }, { href: "/vencimientos?estado=PAGADO", label: "Pagados" }, { href: "/vencimientos?estado=CANCELADO", label: "Cancelados" }].map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">{item.label}</Link>
          ))}
        </nav>

        <section className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
          {records.length === 0 ? <div className="p-8 text-center text-sm text-neutral-600">No hay vencimientos con este filtro.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Título</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Importe</th><th className="px-4 py-3">Acciones</th></tr></thead>
                <tbody className="divide-y divide-neutral-200">
                  {records.map((record) => (
                    <tr key={record.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-4 font-semibold tabular-nums">{formatDate(record.fechaVencimiento)}</td>
                      <td className="px-4 py-4"><p className="font-semibold">{record.titulo}</p><p className="mt-1 text-xs text-neutral-500">{record.proveedor || "Sin proveedor"}{record.titularGasto ? ` · ${record.titularGasto.nombre}` : ""}</p></td>
                      <td className="px-4 py-4">{record.categoria}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${record.origen === "RECURRENTE" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>{origenLabels[record.origen]}</span></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${estadoStyles[record.estado]}`}>{estadoLabels[record.estado]}</span>{record.fechaPago ? <p className="mt-1 text-xs text-neutral-500">Pagado {formatDate(record.fechaPago)}</p> : null}</td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatMoney(record.importe)}</td>
                      <td className="px-4 py-4"><VencimientoActions id={record.id} estado={record.estado} manual={record.origen === "MANUAL"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
