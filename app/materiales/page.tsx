import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function formatMoney(value?: { toString(): string } | number | null) {
  const number =
    typeof value === "number" ? value : value ? Number(value.toString()) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function searchWords(query: string) {
  return query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function materialSearchWhere(query: string) {
  const words = searchWords(query);
  if (words.length === 0) {
    return undefined;
  }

  return {
    AND: words.map((word) => ({
      OR: [
        { codigo: { contains: word, mode: "insensitive" as const } },
        { nombre: { contains: word, mode: "insensitive" as const } },
        { categoria: { contains: word, mode: "insensitive" as const } },
        { descripcion: { contains: word, mode: "insensitive" as const } },
        {
          lineas: {
            some: {
              descripcion: { contains: word, mode: "insensitive" as const },
              gasto: { tipoGasto: "Materiales" },
            },
          },
        },
      ],
    })),
  };
}

async function getMateriales(query: string) {
  const [materiales, resumenes] = await Promise.all([
    prisma.material.findMany({
      where: materialSearchWhere(query),
      orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
    }),
    prisma.gastoLinea.groupBy({
      by: ["materialId"],
      where: {
        materialId: { not: null },
        gasto: { tipoGasto: "Materiales" },
      },
      _count: { _all: true },
      _sum: { importe: true },
    }),
  ]);
  const resumenPorMaterial = new Map(
    resumenes.map((resumen) => [
      resumen.materialId,
      {
        compras: resumen._count._all,
        total: resumen._sum.importe,
      },
    ]),
  );

  return materiales.map((material) => ({
    ...material,
    compras: resumenPorMaterial.get(material.id)?.compras ?? 0,
    total: resumenPorMaterial.get(material.id)?.total ?? null,
  }));
}

type MaterialListado = Awaited<ReturnType<typeof getMateriales>>[number];

function SearchForm({ query }: { query: string }) {
  return (
    <form action="/materiales" className="flex flex-col gap-3 sm:flex-row">
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por código, nombre o categoría"
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
            href="/materiales"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
        <Link
          href={query ? `/materiales/buscar?q=${encodeURIComponent(query)}` : "/materiales/buscar"}
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          Búsqueda avanzada
        </Link>
      </div>
    </form>
  );
}

function MaterialesTable({ materiales }: { materiales: MaterialListado[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3">Unidad base</th>
            <th className="px-4 py-3 text-right">Compras</th>
            <th className="px-4 py-3 text-right">Gasto asociado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {materiales.length > 0 ? (
            materiales.map((material) => (
              <tr key={material.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                  {material.codigo}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/materiales/${material.id}`}
                    className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                  >
                    {material.nombre}
                  </Link>
                  {material.descripcion ? (
                    <p className="mt-1 text-neutral-500">{material.descripcion}</p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {material.categoria || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {material.unidadBase || "-"}
                </td>
                <td className="px-4 py-4 text-right text-neutral-700">
                  {material.compras}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-neutral-950">
                  {formatMoney(material.total)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/materiales/${material.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/materiales/${material.id}/editar`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                No hay materiales con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type MaterialesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function MaterialesPage({
  searchParams,
}: MaterialesPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = queryParam?.trim() ?? "";
  const materiales = await getMateriales(query);

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
              Materiales
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {materiales.length} materiales internos visibles.
            </p>
          </div>
          <Link
            href="/materiales/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Nuevo material
          </Link>
        </header>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(320px,560px)] md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Códigos internos para unificar compras de distintos proveedores.
              </p>
            </div>
            <SearchForm query={query} />
          </div>

          <div className="overflow-x-auto">
            <MaterialesTable materiales={materiales} />
          </div>
        </section>
      </div>
    </main>
  );
}
