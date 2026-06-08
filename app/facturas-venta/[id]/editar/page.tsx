import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { updateFacturaVenta } from "@/app/facturas-venta/actions";
import { FacturaVentaForm } from "@/app/facturas-venta/factura-venta-form";
import { prisma } from "@/app/lib/prisma";

function safeReturnTo(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/facturas-venta";
  }

  const url = new URL(raw, "http://localhost");
  if (url.origin !== "http://localhost") {
    return "/facturas-venta";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

type EditarFacturaVentaPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function EditarFacturaVentaPage({
  params,
  searchParams,
}: EditarFacturaVentaPageProps) {
  await connection();

  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const factura = await prisma.facturaVenta.findUnique({
    where: { id },
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          presupuestos: {
            where: { estado: { in: ["ACEPTADO", "INSTALADO"] } },
            orderBy: { fecha: "desc" },
            select: { id: true, numero: true, titulo: true },
          },
        },
      },
    },
  });

  if (!factura) {
    notFound();
  }

  const returnTo = safeReturnTo(search.returnTo);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href={returnTo}
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Volver
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Editar factura {factura.numeroFactura}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {factura.cliente.nombre}
          </p>
        </header>

        <FacturaVentaForm
          action={updateFacturaVenta}
          cliente={{ id: factura.cliente.id, nombre: factura.cliente.nombre }}
          presupuestos={factura.cliente.presupuestos}
          factura={factura}
          returnTo={returnTo}
          submitLabel="Guardar cambios"
        />
      </div>
    </main>
  );
}
