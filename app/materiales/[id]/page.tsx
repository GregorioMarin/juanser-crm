import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

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

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MaterialPage({ params }: MaterialPageProps) {
  await connection();

  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      lineas: {
        where: {
          gasto: { tipoGasto: "Materiales" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          gasto: {
            select: {
              id: true,
              proveedor: true,
              fecha: true,
              numeroDocumento: true,
            },
          },
        },
      },
    },
  });
  if (!material) {
    notFound();
  }

  const total = material.lineas.reduce(
    (sum, linea) => sum + Number(linea.importe?.toString() ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/materiales"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a materiales
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {material.codigo}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{material.nombre}</p>
          </div>
          <Link
            href={`/materiales/${material.id}/editar`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Editar
          </Link>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Datos del material
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Código" value={material.codigo} />
            <DetailItem label="Nombre" value={material.nombre} />
            <DetailItem label="Categoría" value={material.categoria} />
            <DetailItem label="Unidad base" value={material.unidadBase} />
            <DetailItem
              label="Compras asociadas"
              value={String(material.lineas.length)}
            />
            <DetailItem label="Gasto total" value={formatMoney({ toString: () => String(total) })} />
            <DetailItem label="Creado" value={formatDateTime(material.createdAt)} />
            <DetailItem
              label="Última modificación"
              value={formatDateTime(material.updatedAt)}
            />
          </dl>
          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Descripción interna
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {material.descripcion || "-"}
            </p>
          </div>
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Compras asociadas
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Líneas de gasto vinculadas a este código interno.
              </p>
            </div>
            <span className="text-sm font-semibold text-neutral-700">
              {formatMoney({ toString: () => String(total) })}
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Nº albarán proveedor</th>
                  <th className="px-4 py-3">Descripción proveedor</th>
                  <th className="px-4 py-3 text-right">Piezas</th>
                  <th className="px-4 py-3 text-right">Medida</th>
                  <th className="px-4 py-3 text-right">Precio/medida</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3 text-right">Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {material.lineas.length > 0 ? (
                  material.lineas.map((linea) => (
                    <tr key={linea.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                        {formatDate(linea.gasto.fecha)}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {linea.gasto.proveedor || "Sin proveedor"}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {linea.gasto.numeroDocumento || "-"}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {linea.descripcion}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {linea.piezas?.toString() ?? linea.cantidad?.toString() ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {linea.medida?.toString() ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {linea.precioUnidadMedida?.toString() ??
                          formatMoney(linea.precioUnitario)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-neutral-950">
                        {formatMoney(linea.importe)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/gastos/${linea.gasto.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                        >
                          Ver gasto
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-neutral-500">
                      Este material todavía no tiene compras asociadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
