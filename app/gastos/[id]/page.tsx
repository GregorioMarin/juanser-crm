import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { DeleteGastoForm } from "@/app/gastos/delete-gasto-form";

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
  const gasto = await prisma.gasto.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true } },
    },
  });
  if (!gasto) {
    notFound();
  }

  const archivoEsImagen = /\.(jpe?g|png|webp)$/i.test(gasto.archivoUrl ?? "");

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
            <DetailItem label="Proveedor" value={gasto.proveedor} />
            <DetailItem label="Tipo" value={gasto.tipoDocumento} />
            <DetailItem label="Número" value={gasto.numeroDocumento} />
            <DetailItem label="Categoría" value={gasto.categoria} />
            <DetailItem label="Forma de pago" value={gasto.formaPago} />
            <DetailItem label="Base imponible" value={formatMoney(gasto.baseImponible)} />
            <DetailItem label="IVA" value={formatMoney(gasto.iva)} />
            <DetailItem label="Total" value={formatMoney(gasto.total)} />
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
