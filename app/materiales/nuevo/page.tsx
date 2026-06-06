import Link from "next/link";
import { connection } from "next/server";
import { createMaterial } from "@/app/materiales/actions";
import { MaterialForm } from "@/app/materiales/material-form";

type NuevoMaterialPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NuevoMaterialPage({
  searchParams,
}: NuevoMaterialPageProps) {
  await connection();

  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const returnToGastoId = first("gastoId");
  const returnToLineaId = first("lineaId");
  const defaults = {
    nombre: first("nombre"),
    categoria: first("categoria"),
    unidadBase: first("unidadBase"),
    returnToGastoId,
    returnToLineaId,
  };

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href={returnToGastoId ? `/gastos/${returnToGastoId}/editar` : "/materiales"}
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            {returnToGastoId ? "Volver al gasto" : "Volver a materiales"}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Nuevo material
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            El código interno se asignará automáticamente según la categoría.
          </p>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <MaterialForm
            action={createMaterial}
            submitLabel={returnToLineaId ? "Crear y vincular" : "Crear material"}
            defaults={defaults}
          />
        </section>
      </div>
    </main>
  );
}
