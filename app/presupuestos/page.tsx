import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { DeletePresupuestoForm } from "./delete-presupuesto-form";
import { WhatsAppPresupuestoLink } from "./whatsapp-presupuesto-link";

const estados = ["PENDIENTE", "ACEPTADO", "RECHAZADO"] as const;
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

type PresupuestoEstado = (typeof estados)[number];
const clienteExistenteWhere = { cliente: { id: { gt: 0 } } } as const;

function estadoFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim().toUpperCase();

  if (estados.includes(normalized as PresupuestoEstado)) {
    return normalized as PresupuestoEstado;
  }

  return null;
}

function queryFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

function successFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

function presupuestosReturnPath(query: string, estado: PresupuestoEstado | null) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (estado) {
    params.set("estado", estado);
  }

  const queryString = params.toString();
  return queryString ? `/presupuestos?${queryString}` : "/presupuestos";
}

async function getPresupuestos(query: string, estado: PresupuestoEstado | null) {
  return prisma.presupuesto.findMany({
    where: {
      ...clienteExistenteWhere,
      ...(estado ? { estado } : {}),
      ...(query
        ? {
            OR: [
              { numero: { contains: query, mode: "insensitive" } },
              { titulo: { contains: query, mode: "insensitive" } },
              {
                cliente: {
                  nombre: { contains: query, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
        },
      },
      pagosCuenta: {
        select: {
          importe: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });
}

async function getTotales() {
  const [total, aceptado, pendiente, rechazado] = await Promise.all([
    prisma.presupuesto.aggregate({
      where: clienteExistenteWhere,
      _sum: { totalConIva: true },
    }),
    prisma.presupuesto.aggregate({
      where: { ...clienteExistenteWhere, estado: "ACEPTADO" },
      _sum: { totalConIva: true },
    }),
    prisma.presupuesto.aggregate({
      where: { ...clienteExistenteWhere, estado: "PENDIENTE" },
      _sum: { totalConIva: true },
    }),
    prisma.presupuesto.aggregate({
      where: { ...clienteExistenteWhere, estado: "RECHAZADO" },
      _sum: { totalConIva: true },
    }),
  ]);

  return {
    total: total._sum.totalConIva,
    aceptado: aceptado._sum.totalConIva,
    pendiente: pendiente._sum.totalConIva,
    rechazado: rechazado._sum.totalConIva,
  };
}

type Presupuesto = Awaited<ReturnType<typeof getPresupuestos>>[number];
type Totales = Awaited<ReturnType<typeof getTotales>>;

function formatCurrency(value: unknown) {
  if (!value) {
    return "0,00 €";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function totalPagadoPresupuesto(
  presupuesto: Pick<Presupuesto, "pagosCuenta">,
) {
  return presupuesto.pagosCuenta.reduce(
    (sum, pago) => sum + Number(pago.importe),
    0,
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function estadoClass(estado: string) {
  const styles: Record<PresupuestoEstado, string> = {
    PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-200",
    ACEPTADO: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    RECHAZADO: "bg-rose-100 text-rose-900 ring-rose-200",
  };

  return (
    styles[estado as PresupuestoEstado] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function estadoPago(pagado: number, pendiente: number) {
  if (pendiente <= 0) {
    return "Pagado completo";
  }

  if (pagado > 0) {
    return "Anticipo recibido";
  }

  return "Sin anticipo";
}

function estadoPagoClass(estado: string) {
  const styles: Record<string, string> = {
    "Sin anticipo": "bg-neutral-100 text-neutral-800 ring-neutral-200",
    "Anticipo recibido": "bg-amber-100 text-amber-900 ring-amber-200",
    "Pagado completo": "bg-emerald-100 text-emerald-900 ring-emerald-200",
  };

  return styles[estado] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
}

function TotalesResumen({ totales }: { totales: Totales }) {
  const items = [
    ["Total presupuestado", formatCurrency(totales.total)],
    ["Total aceptado", formatCurrency(totales.aceptado)],
    ["Total pendiente", formatCurrency(totales.pendiente)],
    ["Total rechazado", formatCurrency(totales.rechazado)],
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
        </div>
      ))}
    </section>
  );
}

function Filtros({
  query,
  estado,
}: {
  query: string;
  estado: PresupuestoEstado | null;
}) {
  return (
    <form
      action="/presupuestos"
      className="grid gap-3 rounded-md border border-neutral-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]"
    >
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por cliente, numero o titulo"
      />
      <select className={inputClass} name="estado" defaultValue={estado ?? "TODOS"}>
        <option value="TODOS">Todos</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="ACEPTADO">Aceptado</option>
        <option value="RECHAZADO">Rechazado</option>
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
            href="/presupuestos"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function SuccessMessage() {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-sm">
      Presupuesto eliminado correctamente.
    </div>
  );
}

function PresupuestosTable({
  presupuestos,
  returnTo,
}: {
  presupuestos: Presupuesto[];
  returnTo: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Numero</th>
            <th className="px-4 py-3">Titulo</th>
            <th className="px-4 py-3">Total presupuesto</th>
            <th className="px-4 py-3">Pagado a cuenta</th>
            <th className="px-4 py-3">Pendiente</th>
            <th className="px-4 py-3">Estado pago</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {presupuestos.length > 0 ? (
            presupuestos.map((presupuesto) => {
              const pagado = totalPagadoPresupuesto(presupuesto);
              const pendiente = Number(presupuesto.totalConIva) - pagado;
              const pago = estadoPago(pagado, pendiente);

              return (
                <tr key={presupuesto.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      href={`/clientes/${presupuesto.cliente.id}`}
                      className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                    >
                      {presupuesto.cliente.nombre}
                    </Link>
                    <p className="mt-1 text-neutral-500">
                      {presupuesto.cliente.telefono || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-neutral-950">
                    {presupuesto.numero}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {presupuesto.titulo}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                    {formatCurrency(presupuesto.totalConIva)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald-800">
                    {formatCurrency(pagado)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                    {formatCurrency(pendiente)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoPagoClass(
                        pago,
                      )}`}
                    >
                      {pago}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                        presupuesto.estado,
                      )}`}
                    >
                      {presupuesto.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatDate(presupuesto.fecha)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/clientes/${presupuesto.cliente.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver cliente
                    </Link>
                    <Link
                      href={`/presupuestos/${presupuesto.id}/pdf`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Descargar PDF
                    </Link>
                    <Link
                      href={`/presupuestos/${presupuesto.id}/pdf/ver`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver PDF
                    </Link>
                    <Link
                      href={`/presupuestos/${presupuesto.id}/editar?returnTo=${encodeURIComponent(
                        returnTo,
                      )}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Editar presupuesto
                    </Link>
                    <WhatsAppPresupuestoLink
                      presupuestoId={presupuesto.id}
                      publicToken={presupuesto.publicToken}
                      nombreCliente={presupuesto.cliente.nombre}
                      telefono={presupuesto.cliente.telefono}
                      numero={presupuesto.numero}
                      titulo={presupuesto.titulo}
                      totalConIva={Number(presupuesto.totalConIva)}
                    />
                    <DeletePresupuestoForm
                      presupuestoId={presupuesto.id}
                      returnTo={returnTo}
                    />
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                No hay presupuestos con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type PresupuestosPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    estado?: string | string[];
    presupuestoEliminado?: string | string[];
  }>;
};

export default async function PresupuestosPage({
  searchParams,
}: PresupuestosPageProps) {
  await connection();

  const params = await searchParams;
  const query = queryFromParam(params.q);
  const estado = estadoFromParam(params.estado);
  const returnTo = presupuestosReturnPath(query, estado);
  const [presupuestos, totales] = await Promise.all([
    getPresupuestos(query, estado),
    getTotales(),
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
              Volver al panel
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Presupuestos
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {presupuestos.length} presupuestos visibles ordenados por fecha
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver clientes
          </Link>
        </header>

        {successFromParam(params.presupuestoEliminado) ? <SuccessMessage /> : null}

        <TotalesResumen totales={totales} />
        <Filtros query={query} estado={estado} />
        <PresupuestosTable presupuestos={presupuestos} returnTo={returnTo} />
      </div>
    </main>
  );
}
