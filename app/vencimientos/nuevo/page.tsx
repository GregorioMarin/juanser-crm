import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { ManualForm } from "@/app/vencimientos/manual-form";

export default async function NuevoVencimientoPage() {
  await connection();
  const titulares = await prisma.titularGasto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, codigoInterno: true } });
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link href="/vencimientos" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Volver a vencimientos</Link>
          <h1 className="mt-3 text-3xl font-semibold">Nuevo vencimiento manual</h1>
          <p className="mt-2 text-sm text-neutral-600">Para un pago puntual que no necesita una regla recurrente.</p>
        </header>
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"><ManualForm titulares={titulares} /></section>
      </div>
    </main>
  );
}
