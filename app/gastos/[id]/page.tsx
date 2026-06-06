import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { DeleteGastoForm } from "@/app/gastos/delete-gasto-form";
import { MaterialLineaAction } from "@/app/gastos/[id]/material-linea-action";

function formatDate(date?: Date | null) {
  return date
    ? new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : "-";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: { toString(): string } | null) {
  const number = value ? Number(value.toString()) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm font-medium text-neutral-950">
        {value || "-"}
      </dd>
    </div>
  );
}

type GastoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GastoPage({ params }: GastoPageProps) {
  await connection();

  const { id } = await params;
  const [gasto, materiales] = await Promise.all([
    prisma.gasto.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true } },
        lineas: {
          orderBy: { createdAt: "asc" },
          include: {
            material: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },
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

  const archivoEsImagen = /\.(jpe?g|png|webp)$/i.test(gasto.archivoUrl ?? "");
  const isMateriales = gasto.tipoGasto === "Materiales";

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/gastos"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al listado
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {gasto.proveedor || "Gasto sin proveedor"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {gasto.tipoDocumento || "Documento"} {gasto.numeroDocumento || ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/gastos/${gasto.id}/editar`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Editar
            </Link>
            <DeleteGastoForm gastoId={gasto.id} label="Eliminar" />
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Datos principales</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Fecha" value={formatDate(gasto.fecha)} />
            <DetailItem label="Tipo de gasto" value={gasto.tipoGasto} />
            <DetailItem label="Proveedor" value={gasto.proveedor} />
            <DetailItem label="Tipo" value={gasto.tipoDocumento} />
            <DetailItem label="Número" value={gasto.numeroDocumento} />
            <DetailItem label="Categoría" value={gasto.categoria} />
            <DetailItem label="Base imponible" value={formatMoney(gasto.baseImponible)} />
            <DetailItem label="IVA" value={formatMoney(gasto.iva)} />
            <DetailItem label="Total" value={formatMoney(gasto.total)} />
            <DetailItem label="Forma de pago" value={gasto.formaPago} />
            <DetailItem label="Descripción" value={gasto.descripcion} />
            <DetailItem
              label="Cliente vinculado"
              value={gasto.cliente ? `${gasto.cliente.nombre} (#${gasto.cliente.id})` : null}
            />
            <DetailItem label="Creado" value={formatDateTime(gasto.createdAt)} />
            <DetailItem label="Última modificación" value={formatDateTime(gasto.updatedAt)} />
          </dl>
          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Observaciones
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {gasto.observaciones || "-"}
            </p>
          </div>
        </section>

        {isMateriales ? (
          <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950">
                  Artículos del documento
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Desglose de productos y materiales extraídos del albarán o factura.
                </p>
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                {gasto.lineas.length === 1
                  ? "1 línea"
                  : `${gasto.lineas.length} líneas`}
              </span>
            </div>
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Código interno</th>
                    <th className="px-4 py-3">Descripción proveedor</th>
                    <th className="px-4 py-3">Material vinculado</th>
                    <th className="px-4 py-3 text-right">Piezas</th>
                    <th className="px-4 py-3 text-right">Medida</th>
                    <th className="px-4 py-3 text-right">Precio/medida</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {gasto.lineas.length > 0 ? (
                    gasto.lineas.map((linea) => (
                      <tr key={linea.id}>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                          {linea.material?.codigo ??
                            linea.codigoMaterialDetectado ??
                            "-"}
                        </td>
                        <td className="px-4 py-4 font-medium text-neutral-950">
                          {linea.descripcion}
                        </td>
                        <td className="px-4 py-4 text-neutral-700">
                          {linea.material ? (
                            <Link
                              href={`/materiales/${linea.material.id}`}
                              className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                            >
                              {linea.material.nombre}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-neutral-700">
                          {linea.piezas?.toString() ?? "-"}
                        </td>
                        <td className="px-4 py-4 text-right text-neutral-700">
                          {linea.medida?.toString() ?? "-"}
                        </td>
                        <td className="px-4 py-4 text-right text-neutral-700">
                          {linea.precioUnidadMedida?.toString() ?? "-"}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-neutral-950">
                          {formatMoney(linea.importe)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <MaterialLineaAction
                            gastoId={gasto.id}
                            lineaId={linea.id}
                            descripcion={linea.descripcion}
                            currentMaterialId={linea.materialId}
                            materiales={materiales}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-neutral-500"
                      >
                        Este gasto todavía no tiene líneas de artículos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Archivo original
              </h2>
            </div>
            {gasto.archivoUrl ? (
              <a
                href={gasto.archivoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Abrir archivo
              </a>
            ) : null}
          </div>

          {gasto.archivoUrl ? (
            archivoEsImagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gasto.archivoUrl}
                alt={`Archivo de ${gasto.proveedor ?? "gasto"}`}
                className="max-h-[620px] w-full rounded-md border border-neutral-200 object-contain"
              />
            ) : (
              <iframe
                title={`Archivo de ${gasto.proveedor ?? "gasto"}`}
                src={gasto.archivoUrl}
                className="h-[620px] w-full rounded-md border border-neutral-200 bg-white"
              />
            )
          ) : (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
              Este gasto no tiene archivo asociado.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
