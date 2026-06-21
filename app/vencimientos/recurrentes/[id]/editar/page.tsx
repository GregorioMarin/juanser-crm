import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { updateRecurrente } from "@/app/vencimientos/actions";
import { toDateInput } from "@/app/vencimientos/format";
import { RecurrenteForm } from "@/app/vencimientos/recurrentes/recurrente-form";

export default async function EditarRecurrentePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [record, titulares] = await Promise.all([
    prisma.vencimientoRecurrente.findUnique({ where: { id } }),
    prisma.titularGasto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, codigoInterno: true },
    }),
  ]);
  if (!record) notFound();
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link href="/vencimientos/recurrentes" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Volver a recurrentes</Link>
          <h1 className="mt-3 text-3xl font-semibold">Editar vencimiento recurrente</h1>
          <p className="mt-2 text-sm text-neutral-600">Los vencimientos pagados o cancelados conservarán sus datos históricos.</p>
        </header>
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <RecurrenteForm
            action={updateRecurrente}
            titulares={titulares}
            submitLabel="Guardar cambios"
            values={{
              id: record.id,
              titulo: record.titulo,
              descripcion: record.descripcion ?? "",
              categoria: record.categoria,
              proveedor: record.proveedor ?? "",
              titularGastoId: record.titularGastoId,
              importeEstimado: record.importeEstimado.toString().replace(".", ","),
              frecuencia: record.frecuencia,
              intervalo: record.intervalo,
              diaMes: record.diaMes,
              mesAplicable: record.mesAplicable,
              fechaInicio: toDateInput(record.fechaInicio),
              fechaFin: record.fechaFin ? toDateInput(record.fechaFin) : "",
              activo: record.activo,
            }}
          />
        </section>
      </div>
    </main>
  );
}
