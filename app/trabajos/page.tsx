import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createTrabajo } from "@/app/trabajos/actions";
import { DeleteTrabajoForm } from "@/app/trabajos/delete-trabajo-form";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

type TrabajoFilters = {
  localidad: string;
  tipoTrabajo: string;
  ano: string;
};

function startOfYear(year: number) {
  return new Date(year, 0, 1);
}

function startOfNextYear(year: number) {
  return new Date(year + 1, 0, 1);
}

function trabajoWhere(filters: TrabajoFilters) {
  const year = Number(filters.ano);

  return {
    localidad: filters.localidad || undefined,
    tipoTrabajo: filters.tipoTrabajo || undefined,
    fechaTrabajo: Number.isInteger(year)
      ? {
          gte: startOfYear(year),
          lt: startOfNextYear(year),
        }
      : undefined,
  };
}

async function getTrabajos(filters: TrabajoFilters) {
  return prisma.trabajoTerminado.findMany({
    where: trabajoWhere(filters),
    orderBy: { fechaTrabajo: "desc" },
    include: {
      _count: {
        select: { media: true },
      },
    },
  });
}

async function getFilterOptions() {
  return prisma.trabajoTerminado.findMany({
    select: {
      localidad: true,
      tipoTrabajo: true,
      fechaTrabajo: true,
    },
    orderBy: { fechaTrabajo: "desc" },
  });
}

type Trabajo = Awaited<ReturnType<typeof getTrabajos>>[number];

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function TrabajoForm() {
  return (
    <form
      action={createTrabajo}
      className="grid gap-4 rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-neutral-950">
          Crear trabajo terminado
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Biblioteca interna para web, Google Business Profile y redes sociales.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Titulo</span>
          <input className={inputClass} name="titulo" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cliente</span>
          <input className={inputClass} name="clienteNombre" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Localidad</span>
          <input className={inputClass} name="localidad" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo de trabajo</span>
          <input className={inputClass} name="tipoTrabajo" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Importe</span>
          <input
            className={inputClass}
            name="importe"
            type="number"
            min="0"
            step="0.01"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fecha</span>
          <input
            className={inputClass}
            name="fechaTrabajo"
            type="date"
            defaultValue={toDateInputValue()}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripcion</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="descripcion"
          required
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
        <input
          name="destacadoWeb"
          type="checkbox"
          className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
        />
        Destacado web
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Crear trabajo
      </button>
    </form>
  );
}

function FiltersForm({
  filters,
  localidades,
  tipos,
  anos,
}: {
  filters: TrabajoFilters;
  localidades: string[];
  tipos: string[];
  anos: string[];
}) {
  return (
    <form action="/trabajos" className="grid gap-3 md:grid-cols-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Localidad</span>
        <select className={inputClass} name="localidad" defaultValue={filters.localidad}>
          <option value="">Todas</option>
          {localidades.map((localidad) => (
            <option key={localidad} value={localidad}>
              {localidad}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Tipo de trabajo</span>
        <select
          className={inputClass}
          name="tipoTrabajo"
          defaultValue={filters.tipoTrabajo}
        >
          <option value="">Todos</option>
          {tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Ano</span>
        <select className={inputClass} name="ano" defaultValue={filters.ano}>
          <option value="">Todos</option>
          {anos.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Filtrar
        </button>
        <Link
          href="/trabajos"
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function TrabajosTable({ trabajos }: { trabajos: Trabajo[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Trabajo</th>
            <th className="px-4 py-3">Localidad</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Importe</th>
            <th className="px-4 py-3">Media</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {trabajos.length > 0 ? (
            trabajos.map((trabajo) => (
              <tr key={trabajo.id} className="align-top">
                <td className="px-4 py-4">
                  <Link
                    href={`/trabajos/${trabajo.id}`}
                    className="font-semibold text-neutral-950 transition hover:text-emerald-700"
                  >
                    {trabajo.titulo}
                  </Link>
                  {trabajo.destacadoWeb ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Destacado
                    </span>
                  ) : null}
                  {trabajo.clienteNombre ? (
                    <p className="mt-1 text-neutral-600">{trabajo.clienteNombre}</p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-neutral-700">{trabajo.localidad}</td>
                <td className="px-4 py-4 text-neutral-700">
                  {trabajo.tipoTrabajo}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                  {formatDate(trabajo.fechaTrabajo)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                  {formatCurrency(trabajo.importe)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                  {trabajo._count.media} archivos
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/trabajos/${trabajo.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Abrir ficha
                    </Link>
                    <DeleteTrabajoForm trabajoId={trabajo.id} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                No hay trabajos terminados con esos filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type TrabajosPageProps = {
  searchParams: Promise<{
    localidad?: string | string[];
    tipoTrabajo?: string | string[];
    ano?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TrabajosPage({ searchParams }: TrabajosPageProps) {
  await connection();

  const params = await searchParams;
  const filters: TrabajoFilters = {
    localidad: firstParam(params.localidad),
    tipoTrabajo: firstParam(params.tipoTrabajo),
    ano: firstParam(params.ano),
  };
  const [trabajos, options] = await Promise.all([
    getTrabajos(filters),
    getFilterOptions(),
  ]);
  const importeTotal = trabajos.reduce(
    (sum, trabajo) => sum + Number(trabajo.importe),
    0,
  );
  const importeMedio = trabajos.length > 0 ? importeTotal / trabajos.length : 0;
  const localidades = uniqueSorted(options.map((option) => option.localidad));
  const tipos = uniqueSorted(options.map((option) => option.tipoTrabajo));
  const anos = Array.from(
    new Set(options.map((option) => String(option.fechaTrabajo.getFullYear()))),
  ).sort((a, b) => Number(b) - Number(a));

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
              Trabajos terminados
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Biblioteca interna de trabajos realizados por Carpinteria Juanser.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Nº de trabajos" value={String(trabajos.length)} />
          <StatCard label="Importe total" value={formatCurrency(importeTotal)} />
          <StatCard label="Importe medio" value={formatCurrency(importeMedio)} />
        </section>

        <TrabajoForm />

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">Filtros</h2>
          </div>
          <FiltersForm
            filters={filters}
            localidades={localidades}
            tipos={tipos}
            anos={anos}
          />
        </section>

        <TrabajosTable trabajos={trabajos} />
      </div>
    </main>
  );
}
