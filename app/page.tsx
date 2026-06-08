import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { logout } from "@/app/auth/actions";
import { prisma } from "@/app/lib/prisma";

function currentMonthRange() {
  const now = new Date();

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

function currentYearRange() {
  const now = new Date();

  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear() + 1, 0, 1),
  };
}

function recentRange(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - days);

  return { from, to };
}

async function getHomeMetrics() {
  const month = currentMonthRange();
  const year = currentYearRange();
  const recent = recentRange(30);
  const [
    gastosMes,
    presupuestosPendientes,
    clientesNuevosMes,
    clientesActivos,
    trabajosRecientes,
    facturasTotal,
    facturacionTotal,
    facturacionAno,
    facturasPendientesCobro,
  ] = await Promise.all([
    prisma.gasto.aggregate({
      where: { fecha: { gte: month.from, lt: month.to } },
      _sum: { total: true },
    }),
    prisma.presupuesto.count({
      where: { estado: "PENDIENTE", cliente: { id: { gt: 0 } } },
    }),
    prisma.cliente.count({
      where: { fechaAlta: { gte: month.from, lt: month.to } },
    }),
    prisma.cliente.count({
      where: { estado: { in: ["Aceptado", "En fabricación"] } },
    }),
    prisma.trabajoTerminado.count({
      where: { fechaTrabajo: { gte: recent.from, lte: recent.to } },
    }),
    prisma.facturaVenta.count(),
    prisma.facturaVenta.aggregate({
      _sum: { total: true },
    }),
    prisma.facturaVenta.aggregate({
      where: { fechaFactura: { gte: year.from, lt: year.to } },
      _sum: { total: true },
    }),
    prisma.facturaVenta.count({
      where: { estadoCobro: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
  ]);

  return {
    gastosMes: gastosMes._sum.total,
    presupuestosPendientes,
    clientesNuevosMes,
    trabajosActivosORecientes: clientesActivos + trabajosRecientes,
    trabajosDetalle: `${clientesActivos} activos · ${trabajosRecientes} recientes`,
    facturasTotal,
    facturacionTotal: facturacionTotal._sum.total,
    facturacionAno: facturacionAno._sum.total,
    facturasPendientesCobro,
  };
}

function formatMoney(value?: { toString(): string } | null) {
  const number = value ? Number(value.toString()) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-neutral-500">{detail}</p> : null}
    </article>
  );
}

export default async function Home() {
  await connection();

  const metrics = await getHomeMetrics();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Image
              src="/logo-juanser.jpeg"
              alt="Carpintería Juanser"
              width={150}
              height={100}
              className="h-16 w-auto rounded-sm object-contain sm:h-[66px]"
              sizes="100px"
            />
            <h1 className="text-2xl font-semibold tracking-normal text-neutral-950 sm:text-3xl">
              CRM Carpintería Juanser
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:max-w-3xl">
            <Link
              href="/clientes"
              className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Abrir cartera
            </Link>
            <Link
              href="/presupuestos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver presupuestos
            </Link>
            <Link
              href="/kanban"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Kanban
            </Link>
            <Link
              href="/citas"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Citas
            </Link>
            <Link
              href="/proveedores"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Proveedores
            </Link>
            <Link
              href="/gastos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Gastos y Compras
            </Link>
            <Link
              href="/facturas-venta"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Facturas de venta
            </Link>
            <Link
              href="/actividad"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Actividad
            </Link>
            <Link
              href="/materiales"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Materiales
            </Link>
            <Link
              href="/trabajos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Trabajos terminados
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 sm:w-auto"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Gastos del mes"
            value={formatMoney(metrics.gastosMes)}
          />
          <SummaryCard
            label="Presupuestos pendientes"
            value={String(metrics.presupuestosPendientes)}
          />
          <SummaryCard
            label="Clientes nuevos del mes"
            value={String(metrics.clientesNuevosMes)}
          />
          <SummaryCard
            label="Trabajos activos o recientes"
            value={String(metrics.trabajosActivosORecientes)}
            detail={metrics.trabajosDetalle}
          />
          <SummaryCard
            label="Facturas de venta"
            value={String(metrics.facturasTotal)}
            detail={`${formatMoney(metrics.facturacionTotal)} total · ${formatMoney(
              metrics.facturacionAno,
            )} año · ${metrics.facturasPendientesCobro} pendientes`}
          />
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Accesos rápidos
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Atajos principales para revisar la actividad comercial y compras.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/gastos"
                className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ver gastos
              </Link>
              <Link
                href="/facturas-venta"
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Ver facturas
              </Link>
              <Link
                href="/presupuestos"
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Ver presupuestos
              </Link>
              <Link
                href="/clientes"
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Ver clientes
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
