import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EditPresupuestoForm } from "@/app/presupuestos/edit-presupuesto-form";
import { prisma } from "@/app/lib/prisma";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function decimalInputValue(value: unknown) {
  return Number(value).toFixed(2);
}

function safeReturnTo(value?: string | string[], fallback = "/presupuestos") {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\")
  ) {
    return fallback;
  }

  const url = new URL(raw, "http://localhost");
  if (url.origin !== "http://localhost") {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

async function getPresupuesto(id: number) {
  return prisma.presupuesto.findUnique({
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
    },
  });
}

type EditPresupuestoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function EditPresupuestoPage({
  params,
  searchParams,
}: EditPresupuestoPageProps) {
  await connection();

  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const presupuesto = await getPresupuesto(id);
  if (!presupuesto) {
    notFound();
  }

  const returnTo = safeReturnTo(search.returnTo, `/clientes/${presupuesto.clienteId}`);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href={returnTo}
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Editar presupuesto nº {presupuesto.numero}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Cliente: {presupuesto.cliente.nombre}
            </p>
          </div>
          <Link
            href={`/clientes/${presupuesto.cliente.id}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver ficha
          </Link>
        </header>

        <EditPresupuestoForm
          returnTo={returnTo}
          presupuesto={{
            id: presupuesto.id,
            titulo: presupuesto.titulo,
            descripcion: presupuesto.descripcion,
            estado: presupuesto.estado,
            fecha: toDateInputValue(presupuesto.fecha),
            validezDias: presupuesto.validezDias,
            observaciones: presupuesto.observaciones ?? "",
            ivaPorcentaje: decimalInputValue(presupuesto.ivaPorcentaje),
            lineas: presupuesto.lineas.map((linea) => ({
              key: String(linea.id),
              concepto: linea.concepto,
              descripcion: linea.descripcion ?? "",
              cantidad: decimalInputValue(linea.cantidad),
              precioUnitario: decimalInputValue(linea.precioUnitario),
            })),
          }}
        />
      </div>
    </main>
  );
}
