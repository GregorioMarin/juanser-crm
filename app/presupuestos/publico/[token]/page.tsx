import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { direccionEmpresaCompleta, empresa } from "@/lib/empresa";

async function getPresupuesto(token: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    return null;
  }

  return prisma.presupuesto.findUnique({
    where: { publicToken: token },
    include: {
      cliente: true,
      lineas: {
        orderBy: { id: "asc" },
      },
    },
  });
}

type PresupuestoPublico = NonNullable<Awaited<ReturnType<typeof getPresupuesto>>>;

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
  }).format(Number(value ?? 0));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPercent(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value ?? 0));
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
      <dd className="mt-2 text-sm font-medium text-neutral-950">{value || "-"}</dd>
    </div>
  );
}

function ClienteBlock({ presupuesto }: { presupuesto: PresupuestoPublico }) {
  const { cliente } = presupuesto;

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">
          {empresa.nombre}
        </h2>
        <dl className="mt-4 grid gap-3">
          <DetailItem
            label="Dirección"
            value={direccionEmpresaCompleta}
          />
          <DetailItem label="Teléfono" value={empresa.telefonoPresupuestos} />
        </dl>
      </div>

      <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">Cliente</h2>
        <dl className="mt-4 grid gap-3">
          <DetailItem label="Nombre" value={cliente.nombre} />
          <DetailItem label="Teléfono" value={cliente.telefono} />
          <DetailItem label="Email" value={cliente.email} />
          <DetailItem label="Localidad" value={cliente.localidad} />
        </dl>
      </div>
    </section>
  );
}

function LineasTable({ presupuesto }: { presupuesto: PresupuestoPublico }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Concepto</th>
            <th className="px-4 py-3 text-right">Cantidad</th>
            <th className="px-4 py-3 text-right">Precio unitario</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {presupuesto.lineas.map((linea) => (
            <tr key={linea.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-semibold text-neutral-950">{linea.concepto}</p>
                {linea.descripcion ? (
                  <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                    {linea.descripcion}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-neutral-700">
                {Number(linea.cantidad).toLocaleString("es-ES")}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-neutral-700">
                {formatCurrency(linea.precioUnitario)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-neutral-950">
                {formatCurrency(linea.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PublicPresupuestoPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicPresupuestoPage({
  params,
}: PublicPresupuestoPageProps) {
  await connection();

  const { token } = await params;
  const presupuesto = await getPresupuesto(token);
  if (!presupuesto) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Carpintería Juanser
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Presupuesto nº {presupuesto.numero}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{presupuesto.titulo}</p>
          </div>
          <Link
            href={`/presupuestos/publico/${token}/pdf`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Descargar PDF
          </Link>
        </header>

        <ClienteBlock presupuesto={presupuesto} />

        <dl className="grid gap-3 rounded-md border border-neutral-300 bg-white p-5 shadow-sm sm:grid-cols-3">
          <DetailItem label="Fecha" value={formatDate(presupuesto.fecha)} />
          <DetailItem label="Validez" value={`${presupuesto.validezDias} días`} />
          <DetailItem
            label="Total"
            value={formatCurrency(presupuesto.totalConIva)}
          />
        </dl>

        <section className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Líneas del presupuesto
            </h2>
          </div>
          <LineasTable presupuesto={presupuesto} />
        </section>

        <section className="grid gap-3 rounded-md border border-neutral-300 bg-white p-5 shadow-sm sm:ml-auto sm:w-96">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-neutral-600">Base imponible</span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(presupuesto.totalSinIva)}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-neutral-600">
              IVA {formatPercent(presupuesto.ivaPorcentaje)}%
            </span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(presupuesto.totalIva)}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-neutral-200 pt-3 text-base">
            <span className="font-semibold text-neutral-950">Total</span>
            <span className="font-semibold text-neutral-950">
              {formatCurrency(presupuesto.totalConIva)}
            </span>
          </div>
        </section>

        {presupuesto.observaciones ? (
          <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">
              Observaciones
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
              {presupuesto.observaciones}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
