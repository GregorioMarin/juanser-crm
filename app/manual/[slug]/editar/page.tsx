import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { updateManualArticulo } from "@/app/manual/actions";
import { DeleteManualArticuloForm } from "@/app/manual/delete-manual-articulo-form";
import { ManualArticuloForm } from "@/app/manual/manual-articulo-form";

type EditarManualArticuloPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditarManualArticuloPage({
  params,
}: EditarManualArticuloPageProps) {
  const { slug } = await params;
  const articulo = await prisma.manualArticulo.findUnique({
    where: { slug },
  });

  if (!articulo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Manual técnico-comercial
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-950">
              Editar articulo
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{articulo.titulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/manual/${articulo.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver articulo
            </Link>
            <DeleteManualArticuloForm id={articulo.id} />
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <ManualArticuloForm
            action={updateManualArticulo}
            articulo={articulo}
            submitLabel="Guardar cambios"
          />
        </section>
      </div>
    </main>
  );
}
