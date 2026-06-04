import Link from "next/link";
import { connection } from "next/server";
import { PhoneContactActions } from "@/app/contact-actions";
import { motivoRechazoFromParam } from "@/app/clientes/motivos-rechazo";
import { prisma } from "@/app/lib/prisma";

const linkButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50";

type ClientesPerdidosPageProps = {
  searchParams: Promise<{
    motivo?: string | string[];
  }>;
};

function searchParamString(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  const numberValue = Number(value);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(numberValue);
}

async function getClientesPerdidos(motivo: string | null) {
  if (!motivo) {
    return [];
  }

  return prisma.cliente.findMany({
    where: {
      estado: "Perdido",
      motivoRechazo: motivo,
    },
    orderBy: { fechaAlta: "desc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      localidad: true,
      presupuesto: true,
      importeAceptado: true,
      fechaAlta: true,
      fechaSeguimiento: true,
      motivoRechazo: true,
    },
  });
}

type ClientePerdido = Awaited<ReturnType<typeof getClientesPerdidos>>[number];

function ClientesPerdidosTable({ clientes }: { clientes: ClientePerdido[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-neutral-300 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Alta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Telefono</th>
            <th className="px-4 py-3">Localidad</th>
            <th className="px-4 py-3">Presupuesto</th>
            <th className="px-4 py-3">Aceptado</th>
            <th className="px-4 py-3">Seguimiento</th>
            <th className="px-4 py-3 text-right">Ficha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaAlta)}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                >
                  {cliente.nombre}
                </Link>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                <PhoneContactActions telefono={cliente.telefono} />
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.localidad || "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                {formatCurrency(cliente.presupuesto)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                {formatCurrency(cliente.importeAceptado)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaSeguimiento)}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  Ver ficha
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientesPerdidosCards({ clientes }: { clientes: ClientePerdido[] }) {
  return (
    <div className="grid gap-4 lg:hidden">
      {clientes.map((cliente) => (
        <article
          key={cliente.id}
          className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/clientes/${cliente.id}`}
                className="text-lg font-semibold text-neutral-950 transition hover:text-emerald-800"
              >
                {cliente.nombre}
              </Link>
              <p className="mt-1 text-sm text-neutral-500">
                Alta: {formatDate(cliente.fechaAlta)}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 ring-1 ring-rose-200">
              Perdido
            </span>
          </div>
          <dl className="mt-4 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-neutral-500">Telefono</dt>
              <dd>
                <PhoneContactActions telefono={cliente.telefono} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-500">Localidad</dt>
              <dd>{cliente.localidad || "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-500">Presupuesto</dt>
              <dd>{formatCurrency(cliente.presupuesto)}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-500">Aceptado</dt>
              <dd>{formatCurrency(cliente.importeAceptado)}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-500">Seguimiento</dt>
              <dd>{formatDate(cliente.fechaSeguimiento)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export default async function ClientesPerdidosPage({
  searchParams,
}: ClientesPerdidosPageProps) {
  await connection();

  const params = await searchParams;
  const motivo = motivoRechazoFromParam(searchParamString(params.motivo));
  const clientes = await getClientesPerdidos(motivo);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/clientes"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a clientes
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Clientes perdidos
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {motivo
                ? `${clientes.length} clientes con motivo: ${motivo}`
                : "Selecciona un motivo desde el resumen comercial."}
            </p>
          </div>
          <Link href="/clientes" className={linkButtonClass}>
            Volver
          </Link>
        </header>

        {clientes.length > 0 ? (
          <>
            <ClientesPerdidosTable clientes={clientes} />
            <ClientesPerdidosCards clientes={clientes} />
          </>
        ) : (
          <section className="rounded-md border border-neutral-300 bg-white px-5 py-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">
              No hay clientes para este motivo
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Revisa el bloque de clientes perdidos por motivo en el listado.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
