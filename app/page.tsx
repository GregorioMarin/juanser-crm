import Link from "next/link";
import { UiIcon, type IconName } from "@/app/ui-icon";
import { connection } from "next/server";
import {
  estadoComercialLabel,
  estadoProduccionLabel,
  estadoProduccionNoAplica,
} from "@/app/clientes/estados";
import { countCitasPendientes } from "./citas/data";
import { prisma } from "@/app/lib/prisma";
import { presupuestoPendienteRespuestaWhere } from "@/app/presupuestos/estado-comercial";
import { generateVencimientosHasta } from "@/app/vencimientos/recurrence";

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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const nextThirtyDays = new Date(today);
  nextThirtyDays.setUTCDate(nextThirtyDays.getUTCDate() + 30);
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
    proximosVencimientos,
    recurrentesActivos,
    vencimientosPendientes,
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
    prisma.vencimiento.count({
      where: {
        estado: "PENDIENTE",
        fechaVencimiento: { gte: today, lte: nextThirtyDays },
      },
    }),
    prisma.vencimientoRecurrente.count({ where: { activo: true } }),
    prisma.vencimiento.count({ where: { estado: "PENDIENTE" } }),
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
    proximosVencimientos,
    recurrentesActivos,
    vencimientosPendientes,
  };
}

function formatMoney(value?: { toString(): string } | null) {
  const number = value ? Number(value.toString()) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function SummaryCard({ href, label, value, detail, icon = "file" }: {
  href: string; label: string; value: string; detail?: string; icon?: IconName;
}) {
  return <Link href={href} className="dashboard-metric">
    <UiIcon name={icon} /><div><p>{label}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
  </Link>;
}

function PendingCard({ href, count, title, description, accent, icon }: {
  href: string; count: number; title: string; description: string; accent: string; icon: IconName;
}) {
  return <Link href={href} className="dashboard-pending">
    <span className={`pending-icon ${accent.replace("bg-", "tone-")}`}><UiIcon name={icon} /></span>
    <div><strong>{count}</strong><h3>{title}</h3><p>{description}</p></div><UiIcon name="arrow" />
  </Link>;
}
export default async function Home() {
  await connection();
  await generateVencimientosHasta();

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

  const pendingIcons = ["tag", "calendar", "mail", "check"] as const;
  const quickLinks = [
    { href: "/clientes", label: "Abrir cartera", icon: "users" },
    { href: "/clientes", label: "Crear presupuesto", icon: "file" },
    { href: "/materiales", label: "Consultar materiales", icon: "box" },
    { href: "/calculadoras/armarios", label: "Calculadora armarios", icon: "calculator" },
  ] as const;
  const date = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return <main className="dashboard">
    <header className="dashboard-heading">
      <div><h1>Resumen</h1><p className="dashboard-date">{date}</p></div>
      <div className="dashboard-actions">
        <Link href="/presupuestos" className="crm-button"><UiIcon name="file" />Ver presupuestos</Link>
        <Link href="/clientes" className="crm-button crm-button-primary" title="Selecciona un cliente para crear su presupuesto"><UiIcon name="plus" />Nuevo presupuesto</Link>
      </div>
    </header>
    <section className="dashboard-metrics dashboard-panel" aria-label="Indicadores principales">
      <SummaryCard href="/gastos" label="Gastos del mes" value={formatMoney(metrics.gastosMes)} icon="wallet" />
      <SummaryCard href="/clientes?filtro=nuevos_mes" label="Contactos nuevos del mes" value={String(metrics.clientesNuevosMes)} icon="users" />
      <SummaryCard href="/clientes?estadoComercial=ACEPTADO" label="Trabajos activos o recientes" value={String(metrics.trabajosActivosORecientes)} detail={metrics.trabajosDetalle} icon="briefcase" />
      <SummaryCard href="/facturas" label="Facturado este año" value={formatMoney(metrics.facturacionAno)} icon="chart" />
    </section>
    <section aria-labelledby="pending-title">
      <div className="dashboard-section-heading"><h2 id="pending-title">Estado comercial</h2><span>Situación actual</span></div>
      <div className="dashboard-pending-grid">{comercialPendientes.map((item, index) => <PendingCard key={item.href} {...item} icon={pendingIcons[index]} />)}</div>
    </section>
    <div className="dashboard-columns">
      <section aria-labelledby="production-title">
        <h2 id="production-title">Estado de producción</h2>
        <div className="dashboard-panel dashboard-table-scroll" role="region" aria-label="Fases de producción" tabIndex={0}>
          <table className="dashboard-table">
            <thead><tr><th scope="col">Fase</th><th scope="col">Contactos / trabajos</th><th scope="col">Acción</th></tr></thead>
            <tbody>{produccionPendientes.map(item => <tr key={item.href}>
              <th scope="row"><span className={`production-dot ${item.accent}`} /><span>{item.title}<small>{item.description}</small></span></th>
              <td>{item.count}</td><td><Link href={item.href} aria-label={`Ver detalle: ${item.title}`}>Ver detalle <UiIcon name="arrow" /></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="quick-title"><h2 id="quick-title">Accesos rápidos</h2>
        <div className="dashboard-panel dashboard-quick">{quickLinks.map(item => <Link href={item.href} key={item.label}><UiIcon name={item.icon} /><span>{item.label}</span><UiIcon name="arrow" /></Link>)}
          <p>Para crear un presupuesto, abre la ficha del cliente en la cartera.</p>
          <Link href="/presupuestos?estado=PENDIENTE_RESPUESTA" className="dashboard-budget-pending"><UiIcon name="mail" /><span>Presupuestos pendientes de respuesta<strong>{metrics.presupuestosPendientes}</strong></span><UiIcon name="arrow" /></Link>
        </div>
      </section>
    </div>
    <section className="dashboard-panel dashboard-admin" aria-labelledby="admin-title"><h2 id="admin-title">Administración</h2>
      <div className="dashboard-metrics">
        <SummaryCard href="/facturas" label="Facturas de venta" value={String(metrics.facturasTotal)} detail={`${formatMoney(metrics.facturacionTotal)} total · ${metrics.facturasPendientesCobro} pendientes de cobro`} icon="file" />
        <SummaryCard href="/vencimientos?estado=PENDIENTE" label="Próximos vencimientos" value={String(metrics.proximosVencimientos)} detail="En los próximos 30 días" icon="clock" />
        <SummaryCard href="/vencimientos/recurrentes" label="Recurrentes activos" value={String(metrics.recurrentesActivos)} icon="repeat" />
        <SummaryCard href="/vencimientos?estado=PENDIENTE" label="Pendientes de pago" value={String(metrics.vencimientosPendientes)} icon="wallet" />
      </div>
    </section>
  </main>;
}