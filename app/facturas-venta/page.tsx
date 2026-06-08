import Link from "next/link";
import { connection } from "next/server";
import { createFacturaVenta } from "@/app/facturas-venta/actions";
import { DeleteFacturaVentaForm } from "@/app/facturas-venta/delete-factura-venta-form";
import { FacturaVentaForm } from "@/app/facturas-venta/factura-venta-form";
import { prisma } from "@/app/lib/prisma";

const estadosCobro = ["PENDIENTE", "PARCIAL", "COBRADA"] as const;
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

type EstadoCobro = (typeof estadosCobro)[number];

function estadoFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim().toUpperCase();

  if (estadosCobro.includes(normalized as EstadoCobro)) {
    return normalized as EstadoCobro;
  }

  return null;
}

function queryFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

function facturasReturnPath(query: string, estado: EstadoCobro | null) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (estado) {
    params.set("estado", estado);
  }

  const queryString = params.toString();
  return queryString ? `/facturas-venta?${queryString}` : "/facturas-venta";
}

async function getFacturas(query: string, estado: EstadoCobro | null) {
  return prisma.facturaVenta.findMany({
    where: {
      ...(estado ? { estadoCobro: estado } : {}),
      ...(query
        ? {
            OR: [
              { numeroFactura: { contains: query, mode: "insensitive" } },
              { cliente: { nombre: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      cliente: { select: { id: true, nombre: true } },
      presupuesto: { select: { id: true, numero: true, titulo: true } },
    },
    orderBy: [{ fechaFactura: "desc" }, { createdAt: "desc" }],
  });
}

async function getResumen() {
  const now = new Date();
  const year = {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear() + 1, 0, 1),
  };
  const [totalFacturas, total, ano, pendientes] = await Promise.all([
    prisma.facturaVenta.count(),
    prisma.facturaVenta.aggregate({ _sum: { total: true } }),
    prisma.facturaVenta.aggregate({
      where: { fechaFactura: { gte: year.from, lt: year.to } },
      _sum: { total: true },
    }),
    prisma.facturaVenta.count({
      where: { estadoCobro: { in: ["PENDIENTE", "PARCIAL"] } },
    }),
  ]);

  return {
    totalFacturas,
    total: total._sum.total,
    ano: ano._sum.total,
    pendientes,
  };
}

async function getClientesOptions() {
  return prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      presupuestos: {
        where: { estado: { in: ["ACEPTADO", "INSTALADO"] } },
        orderBy: { fecha: "desc" },
        select: { id: true, numero: true, titulo: true },
      },
    },
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value ?? 0));
}

function estadoClass(estado: string) {
  const styles: Record<EstadoCobro, string> = {
    PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-200",
    PARCIAL: "bg-sky-100 text-sky-900 ring-sky-200",
    COBRADA: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  };

  return styles[estado as EstadoCobro] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </article>
  );
}

function FiltersForm({
  query,
  estado,
}: {
  query: string;
  estado: EstadoCobro | null;
}) {
  return (
    <form
      action="/facturas-venta"
      className="grid gap-3 rounded-md border border-neutral-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]"
    >
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por nº factura o cliente"
      />
      <select className={inputClass} name="estado" defaultValue={estado ?? "TODAS"}>
        <option value="TODAS">Todas</option>
        <option value="PENDIENTE">Pendientes</option>
        <option value="PARCIAL">Parciales</option>
        <option value="COBRADA">Cobradas</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Filtrar
        </button>
        {query || estado ? (
          <Link
            href="/facturas-venta"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

type Factura = Awaited<ReturnType<typeof getFacturas>>[number];

function FacturasTable({
  facturas,
  returnTo,
}: {
  facturas: Factura[];
  returnTo: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Nº factura</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Base imponible</th>
            <th className="px-4 py-3 text-right">IVA</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Estado cobro</th>
            <th className="px-4 py-3">Presupuesto vinculado</th>
            <th className="px-4 py-3">PDF</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {facturas.length > 0 ? (
            facturas.map((factura) => (
              <tr key={factura.id} className="align-top">
                <td className="px-4 py-4 font-semibold text-neutral-950">
                  {factura.numeroFactura}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/clientes/${factura.clienteId}`}
                    className="font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    {factura.cliente.nombre}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                  {formatDate(factura.fechaFactura)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right">
                  {formatCurrency(factura.baseImponible)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right">
                  {formatCurrency(factura.iva)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-neutral-950">
                  {formatCurrency(factura.total)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                      factura.estadoCobro,
                    )}`}
                  >
                    {factura.estadoCobro}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {factura.presupuesto ? (
                    <Link
                      href={`/presupuestos/${factura.presupuesto.id}`}
                      className="font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      {factura.presupuesto.numero}
                    </Link>
                  ) : (
                    <span className="text-neutral-500">Sin vincular</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <a
                      href={factura.archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-neutral-800 underline underline-offset-2"
                    >
                      Ver PDF
                    </a>
                    <a
                      href={factura.archivoUrl}
                      download
                      className="font-semibold text-neutral-800 underline underline-offset-2"
                    >
                      Descargar
                    </a>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/facturas-venta/${factura.id}/editar?returnTo=${encodeURIComponent(
                        returnTo,
                      )}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Editar
                    </Link>
                    <DeleteFacturaVentaForm
                      facturaId={factura.id}
                      returnTo={returnTo}
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10} className="px-4 py-6 text-center text-neutral-500">
                Todavia no hay facturas de venta registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type FacturasVentaPageProps = {
  searchParams: Promise<{ q?: string | string[]; estado?: string | string[] }>;
};

export default async function FacturasVentaPage({
  searchParams,
}: FacturasVentaPageProps) {
  await connection();

  const params = await searchParams;
  const query = queryFromParam(params.q);
  const estado = estadoFromParam(params.estado);
  const returnTo = facturasReturnPath(query, estado);
  const [facturas, resumen, clientes] = await Promise.all([
    getFacturas(query, estado),
    getResumen(),
    getClientesOptions(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al inicio
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Facturas de venta
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Repositorio de PDFs emitidos por la gestoría.
            </p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total facturas" value={String(resumen.totalFacturas)} />
          <SummaryCard label="Facturación total" value={formatCurrency(resumen.total)} />
          <SummaryCard
            label="Facturación año actual"
            value={formatCurrency(resumen.ano)}
          />
          <SummaryCard label="Pendientes de cobro" value={String(resumen.pendientes)} />
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">
              Nueva factura
            </h2>
          </div>
          <FacturaVentaForm
            action={createFacturaVenta}
            clientes={clientes}
            returnTo="/facturas-venta"
            submitLabel="Guardar factura"
          />
        </section>

        <FiltersForm query={query} estado={estado} />
        <FacturasTable facturas={facturas} returnTo={returnTo} />
      </div>
    </main>
  );
}
