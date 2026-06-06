import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { updateMaterial } from "@/app/materiales/actions";
import { MaterialForm } from "@/app/materiales/material-form";

type EditarMaterialPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarMaterialPage({
  params,
}: EditarMaterialPageProps) {
  await connection();

  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id },
  });
  if (!material) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href={`/materiales/${material.id}`}
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Volver al material
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Editar material
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {material.codigo} · {material.nombre}
          </p>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <MaterialForm
            action={updateMaterial}
            submitLabel="Guardar cambios"
            material={material}
          />
        </section>
      </div>
    </main>
  );
}
