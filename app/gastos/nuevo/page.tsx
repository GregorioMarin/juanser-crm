import Link from "next/link";
import { connection } from "next/server";
import { NuevoGastoForm } from "@/app/gastos/nuevo-gasto-form";
import { prisma } from "@/app/lib/prisma";

export default async function NuevoGastoPage() {
  await connection();
  const materiales = await prisma.material.findMany({
    orderBy: [{ categoria: "asc" }, { codigo: "asc" }],
    select: {
      id: true,
      codigo: true,
      nombre: true,
      categoria: true,
      unidadBase: true,
    },
  });

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href="/gastos"
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Volver a gastos
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Nuevo gasto
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sube un documento para analizarlo con IA o crea el gasto directamente.
          </p>
        </header>

        <NuevoGastoForm materiales={materiales} />
      </div>
    </main>
  );
}
