import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

const pageSize = 50;

function pageFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function tipoActividadLabel(tipo: string) {
  const labels: Record<string, string> = {
    CLIENTE_CREADO: "Cliente creado",
    ESTADO_CAMBIADO: "Estado cambiado",
    PRESUPUESTO_CREADO: "Presupuesto creado",
    PRESUPUESTO_EDITADO: "Presupuesto editado",
    PRESUPUESTO_ELIMINADO: "Presupuesto eliminado",
    PAGO_CUENTA_REGISTRADO: "Pago a cuenta registrado",
    PAGO_CUENTA_ELIMINADO: "Pago a cuenta eliminado",
    SEGUIMIENTO_CREADO: "Seguimiento creado",
    IMAGEN_CLIENTE_SUBIDA: "Imagen de cliente subida",
    IMAGEN_JUANSER_SUBIDA: "Imagen Juanser subida",
    CLIENTE_CONVERTIDO_TRABAJO: "Cliente convertido en trabajo",
  };

  return labels[tipo] ?? tipo;
}

async function getActividad(page: number) {
  const [actividades, total] = await Promise.all([
    prisma.actividadCliente.findMany({
      orderBy: { fecha: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    }),
    prisma.actividadCliente.count(),
  ]);

  return { actividades, total };
}

type ActividadItem = Awaited<ReturnType<typeof getActividad>>["actividades"][number];

function ActividadTable({ actividades }: { actividades: ActividadItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Tipo de actividad</th>
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3">Cliente relacionado</th>
            <th className="px-4 py-3 text-right">Enlace</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {actividades.length > 0 ? (
            actividades.map((actividad) => (
              <tr key={actividad.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                  {formatDateTime(actividad.fecha)}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200">
                    {tipoActividadLabel(actividad.tipo)}
                  </span>
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {actividad.descripcion}
                </td>
                <td className="px-4 py-4 font-semibold text-neutral-950">
                  {actividad.cliente?.nombre ?? "-"}
                </td>
                <td className="px-4 py-4 text-right">
                  {actividad.cliente ? (
                    <Link
                      href={`/clientes/${actividad.cliente.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver cliente
                    </Link>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                Todavía no hay actividad registrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  return (
    <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-neutral-700">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={`/actividad?page=${Math.max(1, page - 1)}`}
          aria-disabled={page <= 1}
          className={`inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold transition ${
            page <= 1
              ? "pointer-events-none bg-neutral-100 text-neutral-400"
              : "bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={`/actividad?page=${Math.min(totalPages, page + 1)}`}
          aria-disabled={page >= totalPages}
          className={`inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold transition ${
            page >= totalPages
              ? "pointer-events-none bg-neutral-100 text-neutral-400"
              : "bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          Siguiente
        </Link>
      </div>
    </nav>
  );
}

type ActividadPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function ActividadPage({
  searchParams,
}: ActividadPageProps) {
  await connection();

  const params = await searchParams;
  const requestedPage = pageFromParam(params.page);
  const { actividades, total } = await getActividad(requestedPage);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visibleActivities =
    page === requestedPage ? actividades : (await getActividad(page)).actividades;

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
              Actividad
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {total} acciones registradas, ordenadas por fecha descendente.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/clientes"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver clientes
            </Link>
            <Link
              href="/presupuestos"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver presupuestos
            </Link>
          </div>
        </header>

        <Pagination page={page} totalPages={totalPages} />
        <section className="overflow-x-auto">
          <ActividadTable actividades={visibleActivities} />
        </section>
        <Pagination page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}
