import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { DeleteManualArticuloForm } from "./delete-manual-articulo-form";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const niveles = ["BASICO", "AVANZADO", "TALLER"] as const;

function splitTags(value: string | null) {
  return value
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) ?? [];
}

function searchWords(query: string) {
  return query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function manualWhere({
  query,
  categoria,
  nivel,
  estado,
}: {
  query: string;
  categoria: string;
  nivel: string;
  estado: string;
}) {
  const filters = [];
  const words = searchWords(query);

  if (estado === "inactivos") {
    filters.push({ activo: false });
  } else if (estado !== "todos") {
    filters.push({ activo: true });
  }

  if (categoria) {
    filters.push({ categoria });
  }

  if (niveles.includes(nivel as (typeof niveles)[number])) {
    filters.push({ nivel: nivel as (typeof niveles)[number] });
  }

  if (words.length > 0) {
    filters.push({
      AND: words.map((word) => ({
        OR: [
          { titulo: { contains: word, mode: "insensitive" as const } },
          { resumen: { contains: word, mode: "insensitive" as const } },
          { contenido: { contains: word, mode: "insensitive" as const } },
          { etiquetas: { contains: word, mode: "insensitive" as const } },
          { categoria: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  return filters.length > 0 ? { AND: filters } : undefined;
}

type ManualPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    categoria?: string | string[];
    nivel?: string | string[];
    estado?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ManualPage({ searchParams }: ManualPageProps) {
  await connection();

  const params = await searchParams;
  const query = firstParam(params.q)?.trim() ?? "";
  const categoria = firstParam(params.categoria)?.trim() ?? "";
  const nivel = firstParam(params.nivel)?.trim() ?? "";
  const estado = firstParam(params.estado)?.trim() ?? "activos";
  const [articulos, categorias] = await Promise.all([
    prisma.manualArticulo.findMany({
      where: manualWhere({ query, categoria, nivel, estado }),
      orderBy: [{ orden: "asc" }, { categoria: "asc" }, { titulo: "asc" }],
    }),
    prisma.manualArticulo.findMany({
      distinct: ["categoria"],
      orderBy: { categoria: "asc" },
      select: { categoria: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Base de conocimiento interna
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-950">
              Manual técnico-comercial
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Criterios técnicos, comerciales y de taller para consulta privada del CRM.
            </p>
          </div>
          <Link
            href="/manual/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Nuevo articulo
          </Link>
        </header>

        <section className="grid gap-4">
          <form action="/manual" className="grid gap-3 rounded-md border border-neutral-300 bg-white p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-end">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Buscar</span>
              <input
                className={inputClass}
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Titulo, resumen, contenido, etiquetas..."
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Categoria</span>
              <select className={inputClass} name="categoria" defaultValue={categoria}>
                <option value="">Todas</option>
                {categorias.map((item) => (
                  <option key={item.categoria} value={item.categoria}>
                    {item.categoria}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Nivel</span>
              <select className={inputClass} name="nivel" defaultValue={nivel}>
                <option value="">Todos</option>
                {niveles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Estado</span>
              <select className={inputClass} name="estado" defaultValue={estado}>
                <option value="activos">Activos</option>
                <option value="todos">Todos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Filtrar
            </button>
          </form>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {articulos.length > 0 ? (
              articulos.map((articulo) => (
                <article
                  key={articulo.id}
                  className="flex min-h-64 flex-col justify-between rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm bg-neutral-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                        {articulo.categoria}
                      </span>
                      <span className="rounded-sm bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                        {articulo.nivel}
                      </span>
                      {!articulo.activo ? (
                        <span className="rounded-sm bg-rose-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                          Inactivo
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-neutral-950">
                      <Link
                        href={`/manual/${articulo.slug}`}
                        className="transition hover:text-emerald-800"
                      >
                        {articulo.titulo}
                      </Link>
                    </h2>
                    {articulo.resumen ? (
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {articulo.resumen}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {splitTags(articulo.etiquetas).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/manual/${articulo.slug}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/manual/${articulo.slug}/editar`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Editar
                    </Link>
                    <DeleteManualArticuloForm id={articulo.id} />
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md border border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500 md:col-span-2 xl:col-span-3">
                No hay articulos con esos filtros.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
