import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { updateGasto } from "@/app/gastos/actions";
import { GastoForm } from "@/app/gastos/gasto-form";

type EditarGastoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarGastoPage({ params }: EditarGastoPageProps) {
  await connection();

  const { id } = await params;
  const [gasto, materiales] = await Promise.all([
    prisma.gasto.findUnique({
      where: { id },
      include: {
        lineas: {
          orderBy: { createdAt: "asc" },
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
  if (!gasto) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href={`/gastos/${gasto.id}`}
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Volver al gasto
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Editar gasto
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Modifica los datos del documento registrado.
          </p>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <GastoForm
            action={updateGasto}
            submitLabel="Guardar cambios"
            gasto={gasto}
            materiales={materiales}
          />
        </section>
      </div>
    </main>
  );
}
