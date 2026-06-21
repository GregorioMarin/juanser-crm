import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { frecuenciaLabels } from "@/app/vencimientos/constants";
import { formatDate, formatMoney } from "@/app/vencimientos/format";
import { generateVencimientosHasta } from "@/app/vencimientos/recurrence";
import { RecurrenteActions } from "@/app/vencimientos/recurrentes/recurrente-actions";

export default async function RecurrentesPage() {
  await connection();
  await generateVencimientosHasta();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const records = await prisma.vencimientoRecurrente.findMany({
    orderBy: [{ activo: "desc" }, { titulo: "asc" }],
    include: {
      _count: { select: { vencimientos: true } },
      vencimientos: {
        where: { estado: "PENDIENTE", fechaVencimiento: { gte: today } },
        orderBy: { fechaVencimiento: "asc" },
        take: 1,
        select: { fechaVencimiento: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/vencimientos" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Volver a vencimientos</Link>
            <h1 className="mt-3 text-3xl font-semibold">Vencimientos recurrentes</h1>
            <p className="mt-2 text-sm text-neutral-600">Reglas permanentes para pagos periódicos de empresa.</p>
          </div>
          <Link href="/vencimientos/recurrentes/nuevo" className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Nueva recurrencia</Link>
        </header>

        <section className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
          {records.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-600">Todavía no hay vencimientos recurrentes.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Frecuencia</th>
                    <th className="px-4 py-3">Próximo vencimiento</th>
                    <th className="px-4 py-3 text-right">Importe estimado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {records.map((record) => (
                    <tr key={record.id} className="align-top hover:bg-neutral-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-neutral-950">{record.titulo}</p>
                        <p className="mt-1 text-xs text-neutral-500">{record.proveedor || "Sin proveedor"} · {record._count.vencimientos} generados</p>
                      </td>
                      <td className="px-4 py-4">{record.categoria}</td>
                      <td className="px-4 py-4">{frecuenciaLabels[record.frecuencia]}{record.intervalo > 1 ? ` · cada ${record.intervalo}` : ""}</td>
                      <td className="px-4 py-4 font-medium">{record.vencimientos[0] ? formatDate(record.vencimientos[0].fechaVencimiento) : "Sin próximos"}</td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatMoney(record.importeEstimado)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${record.activo ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}>
                          {record.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/vencimientos/recurrentes/${record.id}/editar`} className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-emerald-700 hover:bg-neutral-50">Editar</Link>
                          <RecurrenteActions id={record.id} activo={record.activo} hasHistory={record._count.vencimientos > 0} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
