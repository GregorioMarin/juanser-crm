import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";

function splitTags(value: string | null) {
  return value
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) ?? [];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ManualArticuloPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ManualArticuloPage({
  params,
}: ManualArticuloPageProps) {
  const { slug } = await params;
  const articulo = await prisma.manualArticulo.findUnique({
    where: { slug },
  });

  if (!articulo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <article className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                {articulo.categoria} · {articulo.nivel}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
                {articulo.titulo}
              </h1>
              {articulo.resumen ? (
                <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
                  {articulo.resumen}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/manual"
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
              >
                Manual
              </Link>
              <Link
                href={`/manual/${articulo.slug}/editar`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Editar
              </Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {splitTags(articulo.etiquetas).map((tag) => (
              <span
                key={tag}
                className="rounded-sm border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600"
              >
                {tag}
              </span>
            ))}
            {!articulo.activo ? (
              <span className="rounded-sm bg-rose-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                Inactivo
              </span>
            ) : null}
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-950">Contenido</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
            {articulo.contenido}
          </div>
        </section>

        {articulo.usoComercial ? (
          <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">Uso comercial</h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
              {articulo.usoComercial}
            </div>
          </section>
        ) : null}

        {articulo.notaInterna ? (
          <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">Nota interna</h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
              {articulo.notaInterna}
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-neutral-300 bg-white p-5 text-sm text-neutral-600 shadow-sm">
          <p>Creado: {formatDate(articulo.createdAt)}</p>
          <p className="mt-1">Actualizado: {formatDate(articulo.updatedAt)}</p>
        </section>
      </article>
    </main>
  );
}
