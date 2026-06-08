import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  createFacturaVenta,
  vincularFacturaVenta,
} from "@/app/facturas-venta/actions";
import { DeleteFacturaVentaForm } from "@/app/facturas-venta/delete-factura-venta-form";
import { FacturaVentaForm } from "@/app/facturas-venta/factura-venta-form";
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

function facturaEstadoCobroClass(estado: string) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-200",
    PARCIAL: "bg-sky-100 text-sky-900 ring-sky-200",
    COBRADA: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  };

  return styles[estado] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
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
        facturasVenta: {
          orderBy: [{ fechaFactura: "desc" }, { createdAt: "desc" }],
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

  const facturasDisponibles = await prisma.facturaVenta.findMany({
    where: {
      clienteId: presupuesto.cliente.id,
      OR: [{ presupuestoId: null }, { presupuestoId: presupuesto.id }],
    },
    orderBy: [{ fechaFactura: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      numeroFactura: true,
      fechaFactura: true,
      total: true,
      presupuestoId: true,
    },
  });
  const isFacturable =
    presupuesto.estado === "ACEPTADO" || presupuesto.estado === "INSTALADO";

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

        {isFacturable ? (
          <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950">
                  Facturas de venta
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Estado:{" "}
                  <span className="font-semibold text-neutral-800">
                    {presupuesto.facturasVenta.length > 0 ? "Facturado" : "Sin factura"}
                  </span>
                </p>
              </div>
              <Link
                href="/facturas-venta"
                className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Ver facturas
              </Link>
            </div>

            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Nº factura</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Estado cobro</th>
                    <th className="px-4 py-3">PDF</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {presupuesto.facturasVenta.length > 0 ? (
                    presupuesto.facturasVenta.map((factura) => (
                      <tr key={factura.id}>
                        <td className="px-4 py-4 font-semibold text-neutral-950">
                          {factura.numeroFactura}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                          {formatDate(factura.fechaFactura)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                          {formatCurrency(factura.total)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${facturaEstadoCobroClass(
                              factura.estadoCobro,
                            )}`}
                          >
                            {factura.estadoCobro}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <a
                            href={factura.archivoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-neutral-800 underline underline-offset-2"
                          >
                            Ver PDF
                          </a>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-end gap-2">
                            <Link
                              href={`/facturas-venta/${factura.id}/editar?returnTo=${encodeURIComponent(
                                `/presupuestos/${presupuesto.id}`,
                              )}`}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                            >
                              Editar
                            </Link>
                            <DeleteFacturaVentaForm
                              facturaId={factura.id}
                              returnTo={`/presupuestos/${presupuesto.id}`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                        No hay facturas vinculadas a este presupuesto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <form
                action={vincularFacturaVenta}
                className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4"
              >
                <input type="hidden" name="presupuestoId" value={presupuesto.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-neutral-700">
                    Vincular factura existente
                  </span>
                  <select
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    name="facturaId"
                    required
                  >
                    <option value="">Selecciona una factura</option>
                    {facturasDisponibles.map((factura) => (
                      <option key={factura.id} value={factura.id}>
                        {factura.numeroFactura} · {formatDate(factura.fechaFactura)} ·{" "}
                        {formatCurrency(factura.total)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Vincular factura
                </button>
              </form>

              <FacturaVentaForm
                action={createFacturaVenta}
                cliente={{
                  id: presupuesto.cliente.id,
                  nombre: presupuesto.cliente.nombre,
                }}
                presupuestos={[
                  {
                    id: presupuesto.id,
                    numero: presupuesto.numero,
                    titulo: presupuesto.titulo,
                  },
                ]}
                returnTo={`/presupuestos/${presupuesto.id}`}
                submitLabel="Crear factura vinculada"
              />
            </div>
          </section>
        ) : null}

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
