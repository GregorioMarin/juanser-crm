import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { MaterialLineaAction } from "@/app/gastos/[id]/material-linea-action";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function searchWords(query: string) {
  return query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function lineSearchWhere(query: string) {
  const words = searchWords(query);

  return {
    gasto: { tipoGasto: "Materiales" },
    ...(words.length > 0
      ? {
          AND: words.map((word) => ({
            OR: [
              { descripcion: { contains: word, mode: "insensitive" as const } },
              {
                material: {
                  codigo: { contains: word, mode: "insensitive" as const },
                },
              },
              {
                material: {
                  nombre: { contains: word, mode: "insensitive" as const },
                },
              },
              {
                material: {
                  categoria: { contains: word, mode: "insensitive" as const },
                },
              },
              {
                material: {
                  descripcion: { contains: word, mode: "insensitive" as const },
                },
              },
              {
                gasto: {
                  proveedor: { contains: word, mode: "insensitive" as const },
                },
              },
            ],
          })),
        }
      : {}),
  };
}

async function getSearchResults(query: string) {
  const [lineas, materiales] = await Promise.all([
    prisma.gastoLinea.findMany({
      where: lineSearchWhere(query),
      orderBy: [{ gasto: { fecha: "desc" } }, { createdAt: "desc" }],
      take: 100,
      include: {
        material: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        gasto: {
          select: {
            id: true,
            proveedor: true,
            fecha: true,
            numeroDocumento: true,
          },
        },
      },
    }),
    prisma.material.findMany({
      orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        categoria: true,
        unidadBase: true,
      },
    }),
  ]);

  return { lineas, materiales };
}

type SearchResult = Awaited<ReturnType<typeof getSearchResults>>["lineas"][number];
type MaterialOption = Awaited<ReturnType<typeof getSearchResults>>["materiales"];

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

function SearchForm({ query }: { query: string }) {
  return (
    <form action="/materiales/buscar" className="grid gap-3 rounded-md border border-neutral-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="TAB-000001, Hickory, Superpan, 285x210x10, canto pvc..."
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Buscar
        </button>
        {query ? (
          <Link
            href="/materiales/buscar"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function ResultsTable({
  lineas,
  materiales,
}: {
  lineas: SearchResult[];
  materiales: MaterialOption;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Código interno</th>
            <th className="px-4 py-3">Nombre material</th>
            <th className="px-4 py-3">Descripción proveedor</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Precio/medida</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {lineas.length > 0 ? (
            lineas.map((linea) => (
              <tr key={linea.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                  {linea.material?.codigo ?? linea.codigoMaterialDetectado ?? "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {linea.material ? (
                    <Link
                      href={`/materiales/${linea.material.id}`}
                      className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                    >
                      {linea.material.nombre}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-4 font-medium text-neutral-950">
                  {linea.descripcion}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {linea.gasto.proveedor || "-"}
                  <p className="mt-1 text-neutral-500">
                    Nº albarán proveedor: {linea.gasto.numeroDocumento || "-"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                  {formatDate(linea.gasto.fecha)}
                </td>
                <td className="px-4 py-4 text-right text-neutral-700">
                  {linea.precioUnidadMedida?.toString() ??
                    formatMoney(linea.precioUnitario)}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-neutral-950">
                  {formatMoney(linea.importe)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/gastos/${linea.gasto.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver gasto
                    </Link>
                    {linea.material ? (
                      <Link
                        href={`/materiales/${linea.material.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Ver material
                      </Link>
                    ) : null}
                    <MaterialLineaAction
                      gastoId={linea.gasto.id}
                      lineaId={linea.id}
                      descripcion={linea.descripcion}
                      currentMaterialId={linea.materialId}
                      materiales={materiales}
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                No hay compras de materiales con esa búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type MaterialesBuscarPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function MaterialesBuscarPage({
  searchParams,
}: MaterialesBuscarPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = queryParam?.trim() ?? "";
  const { lineas, materiales } = await getSearchResults(query);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/materiales"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a materiales
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Buscar materiales
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {lineas.length} compras visibles. Busca por código, nombre, categoría o descripción de proveedor.
            </p>
          </div>
          <Link
            href="/materiales/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Nuevo material
          </Link>
        </header>

        <SearchForm query={query} />
        <section className="overflow-x-auto">
          <ResultsTable lineas={lineas} materiales={materiales} />
        </section>
      </div>
    </main>
  );
}
