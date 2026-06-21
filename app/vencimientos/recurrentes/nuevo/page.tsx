import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createRecurrente } from "@/app/vencimientos/actions";
import { RecurrenteForm } from "@/app/vencimientos/recurrentes/recurrente-form";

export default async function NuevoRecurrentePage() {
  await connection();
  const titulares = await prisma.titularGasto.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, codigoInterno: true },
  });
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link href="/vencimientos/recurrentes" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Volver a recurrentes</Link>
          <h1 className="mt-3 text-3xl font-semibold">Nuevo vencimiento recurrente</h1>
          <p className="mt-2 text-sm text-neutral-600">La regla generará automáticamente los próximos 12 meses y se ampliará al consultar el módulo.</p>
        </header>
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <RecurrenteForm action={createRecurrente} titulares={titulares} submitLabel="Crear recurrencia" />
        </section>
      </div>
    </main>
  );
}
