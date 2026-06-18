import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  createTarifaInterna,
  toggleTarifaInterna,
  updateTarifaInterna,
} from "./actions";
import { DeleteTarifaForm } from "./delete-tarifa-form";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value.toString()));
}

function formatPriceValue(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

function searchWords(query: string) {
  return query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function tarifasWhere(query: string) {
  const words = searchWords(query);
  if (words.length === 0) {
    return undefined;
  }

  return {
    AND: words.map((word) => ({
      OR: [
        { categoria: { contains: word, mode: "insensitive" as const } },
        { nombre: { contains: word, mode: "insensitive" as const } },
        { unidad: { contains: word, mode: "insensitive" as const } },
      ],
    })),
  };
}

type TarifasPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function TarifasInternasPage({
  searchParams,
}: TarifasPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = queryParam?.trim() ?? "";
  const tarifas = await prisma.tarifaInterna.findMany({
    where: tarifasWhere(query),
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Configuracion
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-950">
              Tarifas internas
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Precios editables usados por calculadoras y configuradores internos.
            </p>
          </div>
          <Link
            href="/calculadoras/armarios"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Volver a armarios
          </Link>
        </header>

        <section className="grid gap-4 rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Nueva tarifa</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Usa nombres estables para que las calculadoras puedan reutilizar estas tarifas.
            </p>
          </div>
          <form action={createTarifaInterna} className="grid gap-3 md:grid-cols-[1fr_1.5fr_1fr_1fr_auto] md:items-end">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Categoria</span>
              <input className={inputClass} name="categoria" placeholder="Material" required />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Nombre</span>
              <input className={inputClass} name="nombre" placeholder="MDF 19 mm" required />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Unidad</span>
              <input className={inputClass} name="unidad" placeholder="tablero" required />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-neutral-800">Precio</span>
              <input className={inputClass} name="precio" type="number" min="0" step="0.01" required />
            </label>
            <label className="flex h-10 items-center gap-2 text-sm font-semibold text-neutral-800">
              <input name="activo" type="checkbox" defaultChecked className="h-4 w-4 rounded border-neutral-300" />
              Activa
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 md:col-start-5"
            >
              Crear
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(280px,520px)] md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {tarifas.length} tarifas ordenadas por categoria.
              </p>
            </div>
            <form action="/configuracion/tarifas" className="flex flex-col gap-3 sm:flex-row">
              <input
                className={inputClass}
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Buscar por categoria, nombre o unidad"
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
                    href="/configuracion/tarifas"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                  >
                    Limpiar
                  </Link>
                ) : null}
              </div>
            </form>
          </div>

          <div className="overflow-x-auto">
            <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {tarifas.length > 0 ? (
                    tarifas.map((tarifa) => (
                      <tr key={tarifa.id} className="align-top">
                        <td className="px-4 py-4">
                          <form id={`tarifa-${tarifa.id}`} action={updateTarifaInterna} className="contents">
                            <input type="hidden" name="id" value={tarifa.id} />
                            <input
                              className={inputClass}
                              name="categoria"
                              defaultValue={tarifa.categoria}
                              required
                            />
                          </form>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            className={inputClass}
                            name="nombre"
                            form={`tarifa-${tarifa.id}`}
                            defaultValue={tarifa.nombre}
                            required
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            className={inputClass}
                            name="unidad"
                            form={`tarifa-${tarifa.id}`}
                            defaultValue={tarifa.unidad}
                            required
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <input
                            className={`${inputClass} text-right`}
                            name="precio"
                            form={`tarifa-${tarifa.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={formatPriceValue(tarifa.precio)}
                            required
                          />
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatMoney(tarifa.precio)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <label className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-neutral-800">
                            <input
                              name="activo"
                              form={`tarifa-${tarifa.id}`}
                              type="checkbox"
                              defaultChecked={tarifa.activo}
                              className="h-4 w-4 rounded border-neutral-300"
                            />
                            {tarifa.activo ? "Activa" : "Inactiva"}
                          </label>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="submit"
                              form={`tarifa-${tarifa.id}`}
                              className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                            >
                              Guardar
                            </button>
                            <form action={toggleTarifaInterna}>
                              <input type="hidden" name="id" value={tarifa.id} />
                              <input
                                type="hidden"
                                name="activo"
                                value={tarifa.activo ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                              >
                                {tarifa.activo ? "Desactivar" : "Activar"}
                              </button>
                            </form>
                            <DeleteTarifaForm id={tarifa.id} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                        No hay tarifas con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
