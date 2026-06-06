import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { CostesRentabilidadForm } from "@/app/presupuestos/costes-rentabilidad-form";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value ?? 0));
}

function decimalInputValue(value: unknown) {
  return Number(value ?? 0).toFixed(2);
}

function latestPriceFromLinea(linea: {
  precioUnidadMedida: { toString(): string } | null;
  precioUnitario: { toString(): string } | null;
  importe: { toString(): string } | null;
  cantidad: { toString(): string } | null;
  medida: { toString(): string } | null;
}) {
  if (linea.precioUnidadMedida) {
    return decimalInputValue(linea.precioUnidadMedida);
  }

  if (linea.precioUnitario) {
    return decimalInputValue(linea.precioUnitario);
  }

  const importe = Number(linea.importe ?? 0);
  const cantidad = Number(linea.cantidad ?? linea.medida ?? 0);
  if (importe > 0 && cantidad > 0) {
    return decimalInputValue(importe / cantidad);
  }

  return "0.00";
}

type PresupuestoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PresupuestoPage({ params }: PresupuestoPageProps) {
  await connection();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const [presupuesto, materiales, ultimasCompras] = await Promise.all([
    prisma.presupuesto.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        lineas: {
          orderBy: { id: "asc" },
        },
        costesMateriales: {
          orderBy: { id: "asc" },
        },
        otrosCostes: {
          orderBy: { id: "asc" },
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
    prisma.gastoLinea.findMany({
      where: {
        materialId: { not: null },
        gasto: { tipoGasto: "Materiales" },
      },
      orderBy: [{ gasto: { fecha: "desc" } }, { createdAt: "desc" }],
      select: {
        materialId: true,
        precioUnidadMedida: true,
        precioUnitario: true,
        importe: true,
        cantidad: true,
        medida: true,
      },
    }),
  ]);

  if (!presupuesto) {
    notFound();
  }

  const precioPorMaterial = new Map<string, string>();
  for (const linea of ultimasCompras) {
    if (linea.materialId && !precioPorMaterial.has(linea.materialId)) {
      precioPorMaterial.set(linea.materialId, latestPriceFromLinea(linea));
    }
  }

  const materialOptions = materiales.map((material) => ({
    ...material,
    ultimoPrecioCoste: precioPorMaterial.get(material.id) ?? "0.00",
  }));

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/presupuestos"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a presupuestos
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Presupuesto nº {presupuesto.numero}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {presupuesto.cliente.nombre} · {presupuesto.titulo}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/clientes/${presupuesto.cliente.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver cliente
            </Link>
            <Link
              href={`/presupuestos/${presupuesto.id}/editar?returnTo=${encodeURIComponent(
                `/presupuestos/${presupuesto.id}`,
              )}`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Editar presupuesto
            </Link>
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Datos del presupuesto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Fecha
              </p>
              <p className="mt-2 font-semibold text-neutral-950">
                {formatDate(presupuesto.fecha)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Estado
              </p>
              <p className="mt-2 font-semibold text-neutral-950">
                {presupuesto.estado}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Base
              </p>
              <p className="mt-2 font-semibold text-neutral-950">
                {formatCurrency(presupuesto.totalSinIva)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Total cliente
              </p>
              <p className="mt-2 font-semibold text-neutral-950">
                {formatCurrency(presupuesto.totalConIva)}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {presupuesto.lineas.map((linea) => (
                  <tr key={linea.id}>
                    <td className="px-4 py-3 font-semibold text-neutral-950">
                      {linea.concepto}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {linea.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      {linea.cantidad.toString()}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">
                      {formatCurrency(linea.precioUnitario)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-950">
                      {formatCurrency(linea.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">
              Costes y Rentabilidad
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Estimación interna preparada para enlazar en el futuro con consumos reales de materiales.
            </p>
          </div>
          <CostesRentabilidadForm
            materiales={materialOptions}
            initialData={{
              presupuestoId: presupuesto.id,
              presupuestoCliente: decimalInputValue(presupuesto.totalConIva),
              costeHorasEstimadas: decimalInputValue(
                presupuesto.costeHorasEstimadas,
              ),
              costeHora: decimalInputValue(presupuesto.costeHora),
              costeTransporte: decimalInputValue(presupuesto.costeTransporte),
              costeMontaje: decimalInputValue(presupuesto.costeMontaje),
              materiales: presupuesto.costesMateriales.map((linea) => ({
                key: String(linea.id),
                materialId: linea.materialId ?? "",
                descripcion: linea.descripcion,
                cantidad: decimalInputValue(linea.cantidad),
                precioCoste: decimalInputValue(linea.precioCoste),
              })),
              otrosCostes: presupuesto.otrosCostes.map((linea) => ({
                key: String(linea.id),
                descripcion: linea.descripcion,
                importe: decimalInputValue(linea.importe),
              })),
            }}
          />
        </section>
      </div>
    </main>
  );
}
