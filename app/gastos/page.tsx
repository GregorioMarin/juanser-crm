import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { categoriasGasto, tiposDocumentoGasto } from "@/app/gastos/constants";
import { DeleteGastoForm } from "@/app/gastos/delete-gasto-form";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function formatDate(date?: Date | null) {
  return date
    ? new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : "-";
}

function formatMoney(value?: { toString(): string } | null) {
  const number = value ? Number(value.toString()) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function dateFromInput(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function monthRange(date = new Date()) {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function yearRange(date = new Date()) {
  return {
    from: new Date(date.getFullYear(), 0, 1),
    to: new Date(date.getFullYear() + 1, 0, 1),
  };
}

async function getGastos(filters: {
  q: string;
  categoria: string;
  tipoDocumento: string;
  desde: string;
  hasta: string;
}) {
  const desde = dateFromInput(filters.desde);
  const hastaBase = dateFromInput(filters.hasta);
  const hasta = hastaBase
    ? new Date(hastaBase.getFullYear(), hastaBase.getMonth(), hastaBase.getDate() + 1)
    : undefined;

  return prisma.gasto.findMany({
    where: {
      AND: [
        filters.q
          ? {
              OR: [
                { proveedor: { contains: filters.q, mode: "insensitive" } },
                {
                  numeroDocumento: {
                    contains: filters.q,
                    mode: "insensitive",
                  },
                },
                { descripcion: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {},
        filters.categoria ? { categoria: filters.categoria } : {},
        filters.tipoDocumento ? { tipoDocumento: filters.tipoDocumento } : {},
        desde ? { fecha: { gte: desde } } : {},
        hasta ? { fecha: { lt: hasta } } : {},
      ],
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
}

async function getResumen() {
  const currentMonth = monthRange();
  const currentYear = yearRange();
  const [mes, ano, totalGastos, proveedores] = await Promise.all([
    prisma.gasto.aggregate({
      where: { fecha: { gte: currentMonth.from, lt: currentMonth.to } },
      _sum: { total: true },
    }),
    prisma.gasto.aggregate({
      where: { fecha: { gte: currentYear.from, lt: currentYear.to } },
      _sum: { total: true },
    }),
    prisma.gasto.count(),
    prisma.gasto.groupBy({
      by: ["proveedor"],
      where: { proveedor: { not: null } },
      _sum: { total: true },
    }),
  ]);

  const proveedorTop = proveedores
    .map((item) => ({
      proveedor: item.proveedor ?? "Sin proveedor",
      total: Number(item._sum.total?.toString() ?? 0),
    }))
    .sort((a, b) => b.total - a.total)[0];

  return {
    mes: mes._sum.total,
    ano: ano._sum.total,
    totalGastos,
    proveedorTop,
  };
}

type Gasto = Awaited<ReturnType<typeof getGastos>>[number];

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
    <article className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-neutral-500">{detail}</p> : null}
    </article>
  );
}

function FiltersForm({
  filters,
}: {
  filters: { q: string; categoria: string; tipoDocumento: string; desde: string; hasta: string };
}) {
  return (
    <form action="/gastos" className="grid gap-3 rounded-md border border-neutral-300 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">Buscar</span>
        <input
          className={inputClass}
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Proveedor, número o descripción"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">Categoría</span>
        <select className={inputClass} name="categoria" defaultValue={filters.categoria}>
          <option value="">Todas</option>
          {categoriasGasto.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">Documento</span>
        <select
          className={inputClass}
          name="tipoDocumento"
          defaultValue={filters.tipoDocumento}
        >
          <option value="">Todos</option>
          {tiposDocumentoGasto.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">Desde</span>
        <input className={inputClass} name="desde" type="date" defaultValue={filters.desde} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">Hasta</span>
        <input className={inputClass} name="hasta" type="date" defaultValue={filters.hasta} />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Filtrar
        </button>
        <Link
          href="/gastos"
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function GastosTable({ gastos }: { gastos: Gasto[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3 text-right">Base</th>
            <th className="px-4 py-3 text-right">IVA</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {gastos.length > 0 ? (
            gastos.map((gasto) => (
              <tr key={gasto.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                  {formatDate(gasto.fecha)}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/gastos/${gasto.id}`}
                    className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                  >
                    {gasto.proveedor || "Sin proveedor"}
                  </Link>
                  {gasto.descripcion ? (
                    <p className="mt-1 text-neutral-500">{gasto.descripcion}</p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-neutral-700">{gasto.tipoDocumento || "-"}</td>
                <td className="px-4 py-4 text-neutral-700">{gasto.numeroDocumento || "-"}</td>
                <td className="px-4 py-4 text-neutral-700">{gasto.categoria || "-"}</td>
                <td className="px-4 py-4 text-right text-neutral-700">
                  {formatMoney(gasto.baseImponible)}
                </td>
                <td className="px-4 py-4 text-right text-neutral-700">
                  {formatMoney(gasto.iva)}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-neutral-950">
                  {formatMoney(gasto.total)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/gastos/${gasto.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/gastos/${gasto.id}/editar`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Editar
                    </Link>
                    <DeleteGastoForm gastoId={gasto.id} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-neutral-500">
                No hay gastos con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type GastosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GastosPage({ searchParams }: GastosPageProps) {
  await connection();

  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const filters = {
    q: first("q"),
    categoria: first("categoria"),
    tipoDocumento: first("tipoDocumento"),
    desde: first("desde"),
    hasta: first("hasta"),
  };
  const [gastos, resumen] = await Promise.all([getGastos(filters), getResumen()]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900">
              Volver al panel
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Gastos y Compras
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Registro de facturas, albaranes, tickets y compras de proveedores.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/gastos/estadisticas"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Estadísticas
            </Link>
            <Link
              href="/gastos/nuevo"
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Nuevo gasto
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Gastos del mes" value={formatMoney(resumen.mes)} />
          <SummaryCard label="Gastos del año" value={formatMoney(resumen.ano)} />
          <SummaryCard label="Número total" value={String(resumen.totalGastos)} />
          <SummaryCard
            label="Proveedor con más gasto"
            value={resumen.proveedorTop?.proveedor ?? "-"}
            detail={resumen.proveedorTop ? formatMoney({ toString: () => String(resumen.proveedorTop.total) }) : undefined}
          />
        </section>

        <FiltersForm filters={filters} />

        <section className="overflow-x-auto">
          <GastosTable gastos={gastos} />
        </section>
      </div>
    </main>
  );
}
