import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { logout } from "@/app/auth/actions";
import {
  estadoComercialLabel,
  estadoProduccionLabel,
  estadoProduccionNoAplica,
} from "@/app/clientes/estados";
import { countCitasPendientes } from "./citas/data";
import { prisma } from "@/app/lib/prisma";
import { presupuestoPendienteRespuestaWhere } from "@/app/presupuestos/estado-comercial";

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
    pendienteDarPrecio,
    citasPendientes,
    pendienteRespuesta,
    aceptados,
    noAplica,
    pendientePago50,
    pendientePedirMateriales,
    pendienteFabricar,
    enFabricacion,
    pendienteInstalacion,
    finalizados,
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
      where: presupuestoPendienteRespuestaWhere(),
    }),
    prisma.cliente.count({
      where: { fechaAlta: { gte: month.from, lt: month.to } },
    }),
    prisma.cliente.count({
      where: {
        estado: "ACEPTADO",
      },
    }),
    prisma.cliente.count({ where: { estado: "PENDIENTE_DAR_PRECIO" } }),
    countCitasPendientes(),
    prisma.cliente.count({ where: { estado: "PENDIENTE_RESPUESTA" } }),
    prisma.cliente.count({ where: { estado: "ACEPTADO" } }),
    prisma.cliente.count({
      where: {
        OR: [
          { estadoProduccion: estadoProduccionNoAplica },
          { estado: { not: "ACEPTADO" } },
        ],
      },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_PAGO_50" },
    }),
    prisma.cliente.count({
      where: {
        estado: "ACEPTADO",
        estadoProduccion: "PENDIENTE_PEDIR_MATERIALES",
      },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_FABRICAR" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "EN_FABRICACION" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_INSTALACION" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "FINALIZADO" },
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
    trabajosDetalle: `${clientesActivos} aceptados · ${trabajosRecientes} recientes`,
    pendientesHoy: {
      pendienteDarPrecio,
      citasPendientes,
      pendienteRespuesta,
      aceptados,
      noAplica,
      pendientePago50,
      pendientePedirMateriales,
      pendienteFabricar,
      enFabricacion,
      pendienteInstalacion,
      finalizados,
    },
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
  href,
  label,
  value,
  detail,
}: {
  href: string;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="block cursor-pointer rounded-md border border-neutral-300 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-neutral-500">{detail}</p> : null}
    </Link>
  );
}

function PendingCard({
  href,
  count,
  title,
  description,
  accent,
}: {
  href: string;
  count: number;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 flex-col justify-between rounded-md border border-neutral-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`h-3 w-3 rounded-full ${accent}`} />
        <span className="text-4xl font-semibold tabular-nums text-neutral-950">
          {count}
        </span>
      </div>
      <div>
        <h3 className="text-base font-semibold text-neutral-950 transition group-hover:text-emerald-800">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-5 text-neutral-600">{description}</p>
      </div>
    </Link>
  );
}

export default async function Home() {
  await connection();

  const metrics = await getHomeMetrics();
  const comercialPendientes = [
    {
      href: "/clientes?estadoComercial=PENDIENTE_DAR_PRECIO",
      count: metrics.pendientesHoy.pendienteDarPrecio,
      title: estadoComercialLabel("PENDIENTE_DAR_PRECIO"),
      description: "Solicitudes pendientes de valorar.",
      accent: "bg-orange-500",
    },
    {
      href: "/citas?filtro=pendientes",
      count: metrics.pendientesHoy.citasPendientes,
      title: "Citas pendientes",
      description: "Citas pendientes o futuras, manuales y de Amelia.",
      accent: "bg-cyan-500",
    },
    {
      href: "/clientes?estadoComercial=PENDIENTE_RESPUESTA",
      count: metrics.pendientesHoy.pendienteRespuesta,
      title: estadoComercialLabel("PENDIENTE_RESPUESTA"),
      description: "Presupuestos enviados esperando respuesta.",
      accent: "bg-sky-500",
    },
    {
      href: "/clientes?estadoComercial=ACEPTADO",
      count: metrics.pendientesHoy.aceptados,
      title: "Aceptados",
      description: "Presupuestos aceptados.",
      accent: "bg-emerald-500",
    },
  ] as const;
  const produccionPendientes = [
    {
      href: "/clientes?estadoProduccion=NO_APLICA",
      count: metrics.pendientesHoy.noAplica,
      title: estadoProduccionLabel("NO_APLICA"),
      description: "Contactos fuera de producción hasta aceptación.",
      accent: "bg-neutral-500",
    },
    {
      href: "/clientes?estadoProduccion=PENDIENTE_PAGO_50",
      count: metrics.pendientesHoy.pendientePago50,
      title: estadoProduccionLabel("PENDIENTE_PAGO_50"),
      description: "Trabajos pendientes de anticipo.",
      accent: "bg-yellow-500",
    },
    {
      href: "/clientes?estadoProduccion=PENDIENTE_PEDIR_MATERIALES",
      count: metrics.pendientesHoy.pendientePedirMateriales,
      title: estadoProduccionLabel("PENDIENTE_PEDIR_MATERIALES"),
      description: "Materiales por revisar y pedir.",
      accent: "bg-blue-500",
    },
    {
      href: "/clientes?estadoProduccion=PENDIENTE_FABRICAR",
      count: metrics.pendientesHoy.pendienteFabricar,
      title: estadoProduccionLabel("PENDIENTE_FABRICAR"),
      description: "Trabajos listos para entrar a taller.",
      accent: "bg-stone-500",
    },
    {
      href: "/clientes?estadoProduccion=EN_FABRICACION",
      count: metrics.pendientesHoy.enFabricacion,
      title: estadoProduccionLabel("EN_FABRICACION"),
      description: "Trabajos actualmente en fabricación.",
      accent: "bg-violet-500",
    },
    {
      href: "/clientes?estadoProduccion=PENDIENTE_INSTALACION",
      count: metrics.pendientesHoy.pendienteInstalacion,
      title: estadoProduccionLabel("PENDIENTE_INSTALACION"),
      description: "Trabajos pendientes de instalar.",
      accent: "bg-indigo-500",
    },
    {
      href: "/clientes?estadoProduccion=FINALIZADO",
      count: metrics.pendientesHoy.finalizados,
      title: "Finalizados",
      description: "Trabajos completados.",
      accent: "bg-teal-500",
    },
  ] as const;

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
              href="/calculadoras/armarios"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Calculadora armarios
            </Link>
            <Link
              href="/configuracion/tarifas"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Tarifas internas
            </Link>
            <Link
              href="/manual"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Manual técnico-comercial
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
            href="/gastos"
            label="Gastos del mes"
            value={formatMoney(metrics.gastosMes)}
          />
          <SummaryCard
            href="/presupuestos?estado=PENDIENTE_RESPUESTA"
            label="Presupuestos pendientes de respuesta"
            value={String(metrics.presupuestosPendientes)}
          />
          <SummaryCard
            href="/clientes?filtro=nuevos_mes"
            label="Contactos nuevos del mes"
            value={String(metrics.clientesNuevosMes)}
          />
          <SummaryCard
            href="/clientes?estadoComercial=ACEPTADO"
            label="Trabajos activos o recientes"
            value={String(metrics.trabajosActivosORecientes)}
            detail={metrics.trabajosDetalle}
          />
          <SummaryCard
            href="/facturas"
            label="Facturas de venta"
            value={String(metrics.facturasTotal)}
            detail={`${formatMoney(metrics.facturacionTotal)} total · ${formatMoney(
              metrics.facturacionAno,
            )} año · ${metrics.facturasPendientesCobro} pendientes`}
          />
        </section>

        <section className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              Pendientes de hoy
            </h2>
          </div>
          <div className="grid gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Estado comercial
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {comercialPendientes.map((item) => (
                  <PendingCard key={item.href} {...item} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Estado de producción
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {produccionPendientes.map((item) => (
                  <PendingCard key={item.href} {...item} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
