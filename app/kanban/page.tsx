import Link from "next/link";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { prisma } from "@/app/lib/prisma";

const estadosKanban = [
  "Nuevo lead",
  "Visitado",
  "Presupuesto enviado",
  "Pendiente respuesta",
  "Aceptado",
  "En fabricación",
  "Instalado",
  "Perdido",
] as const;

type EstadoKanban = (typeof estadosKanban)[number];

const estadoStyles: Record<
  EstadoKanban,
  { column: string; badge: string; border: string }
> = {
  "Nuevo lead": {
    column: "bg-sky-50",
    badge: "bg-sky-100 text-sky-900 ring-sky-200",
    border: "border-sky-200",
  },
  Visitado: {
    column: "bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-900 ring-indigo-200",
    border: "border-indigo-200",
  },
  "Presupuesto enviado": {
    column: "bg-amber-50",
    badge: "bg-amber-100 text-amber-950 ring-amber-200",
    border: "border-amber-200",
  },
  "Pendiente respuesta": {
    column: "bg-orange-50",
    badge: "bg-orange-100 text-orange-950 ring-orange-200",
    border: "border-orange-200",
  },
  Aceptado: {
    column: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    border: "border-emerald-200",
  },
  "En fabricación": {
    column: "bg-violet-50",
    badge: "bg-violet-100 text-violet-900 ring-violet-200",
    border: "border-violet-200",
  },
  Instalado: {
    column: "bg-teal-50",
    badge: "bg-teal-100 text-teal-900 ring-teal-200",
    border: "border-teal-200",
  },
  Perdido: {
    column: "bg-rose-50",
    badge: "bg-rose-100 text-rose-900 ring-rose-200",
    border: "border-rose-200",
  },
};

function requiredClienteId(formData: FormData) {
  const id = Number(formData.get("clienteId"));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cliente no valido.");
  }

  return id;
}

function requiredEstado(formData: FormData) {
  const value = formData.get("estado");
  if (
    typeof value !== "string" ||
    !estadosKanban.includes(value as EstadoKanban)
  ) {
    throw new Error("Estado no valido.");
  }

  return value as EstadoKanban;
}

async function cambiarEstadoCliente(formData: FormData) {
  "use server";

  const clienteId = requiredClienteId(formData);
  const estado = requiredEstado(formData);

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  if (cliente.estado !== estado) {
    await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        estado,
        motivoRechazo: estado === "Perdido" ? undefined : null,
      },
    });
    await registrarActividadCliente({
      clienteId,
      tipo: "ESTADO_CAMBIADO",
      descripcion: `Estado cambiado de ${cliente.estado} a ${estado}`,
    });
  }

  revalidatePath("/");
  revalidatePath("/kanban");
  revalidatePath("/clientes");
  revalidatePath("/clientes/perdidos");
  revalidatePath(`/clientes/${clienteId}`);
}

async function getClientesKanban() {
  return prisma.cliente.findMany({
    orderBy: [{ fechaSeguimiento: "asc" }, { fechaAlta: "desc" }],
    select: {
      id: true,
      nombre: true,
      telefono: true,
      localidad: true,
      origenContacto: true,
      tipoCliente: true,
      tipoTrabajo: true,
      motivoRechazo: true,
      fechaMedicion: true,
      fechaInstalacion: true,
      importeAceptado: true,
      presupuesto: true,
      fechaSeguimiento: true,
      estado: true,
      presupuestos: {
        select: {
          totalConIva: true,
        },
      },
    },
  });
}

type ClienteKanban = Awaited<ReturnType<typeof getClientesKanban>>[number];

function formatDate(date?: Date | null) {
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
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function importePresupuestado(cliente: ClienteKanban) {
  const totalPresupuestos = cliente.presupuestos.reduce(
    (sum, presupuesto) => sum + Number(presupuesto.totalConIva),
    0,
  );

  if (totalPresupuestos > 0) {
    return totalPresupuestos;
  }

  return cliente.presupuesto ? Number(cliente.presupuesto) : null;
}

function displayTipoCliente(cliente: ClienteKanban) {
  return cliente.tipoCliente || cliente.tipoTrabajo || "-";
}

function estadoConfig(estado: string) {
  return (
    estadoStyles[estado as EstadoKanban] ?? {
      column: "bg-neutral-50",
      badge: "bg-neutral-100 text-neutral-800 ring-neutral-200",
      border: "border-neutral-200",
    }
  );
}

function ClienteCard({ cliente }: { cliente: ClienteKanban }) {
  const config = estadoConfig(cliente.estado);
  const importe = importePresupuestado(cliente);

  return (
    <article
      className={`rounded-md border bg-white p-4 shadow-sm ${config.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-950">
            {cliente.nombre}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            {cliente.telefono || "Sin telefono"}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${config.badge}`}
        >
          {cliente.estado}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Localidad</dt>
          <dd className="text-right font-medium text-neutral-900">
            {cliente.localidad || "-"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Origen</dt>
          <dd className="text-right font-medium text-neutral-900">
            {cliente.origenContacto || "-"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Tipo</dt>
          <dd className="text-right font-medium text-neutral-900">
            {displayTipoCliente(cliente)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Presupuestado</dt>
          <dd className="text-right font-semibold text-neutral-950">
            {formatCurrency(importe)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Aceptado</dt>
          <dd className="text-right font-semibold text-neutral-950">
            {formatCurrency(cliente.importeAceptado)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Seguimiento</dt>
          <dd className="text-right font-medium text-neutral-900">
            {formatDate(cliente.fechaSeguimiento)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Medición</dt>
          <dd className="text-right font-medium text-neutral-900">
            {formatDate(cliente.fechaMedicion)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-neutral-500">Instalación</dt>
          <dd className="text-right font-medium text-neutral-900">
            {formatDate(cliente.fechaInstalacion)}
          </dd>
        </div>
        {cliente.estado === "Perdido" ? (
          <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
              Motivo rechazo
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rose-950">
              {cliente.motivoRechazo || "-"}
            </dd>
          </div>
        ) : null}
      </dl>

      <form action={cambiarEstadoCliente} className="mt-4 grid gap-2">
        <input type="hidden" name="clienteId" value={cliente.id} />
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Cambiar estado
          </span>
          <select
            name="estado"
            defaultValue={cliente.estado}
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            {estadosKanban.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Actualizar estado
        </button>
      </form>

      <Link
        href={`/clientes/${cliente.id}`}
        className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
      >
        Abrir ficha cliente
      </Link>
    </article>
  );
}

function KanbanColumn({
  estado,
  clientes,
}: {
  estado: EstadoKanban;
  clientes: ClienteKanban[];
}) {
  const config = estadoStyles[estado];

  return (
    <section
      className={`flex min-h-[260px] flex-col rounded-md border border-neutral-300 ${config.column}`}
    >
      <div className="sticky top-0 z-10 rounded-t-md border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <h2 className="flex items-center justify-between gap-3 text-sm font-semibold text-neutral-950">
          <span>{estado}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
            {clientes.length}
          </span>
        </h2>
      </div>
      <div className="grid gap-3 p-3">
        {clientes.length > 0 ? (
          clientes.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-neutral-300 bg-white/70 px-3 py-6 text-center text-sm text-neutral-500">
            Sin clientes en esta columna.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function KanbanPage() {
  await connection();

  const clientes = await getClientesKanban();
  const clientesPorEstado = new Map<EstadoKanban, ClienteKanban[]>(
    estadosKanban.map((estado) => [estado, []]),
  );

  for (const cliente of clientes) {
    const estado = estadosKanban.includes(cliente.estado as EstadoKanban)
      ? (cliente.estado as EstadoKanban)
      : "Nuevo lead";
    clientesPorEstado.get(estado)?.push(cliente);
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al panel
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Kanban comercial
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Gestion visual de estados para {clientes.length} clientes.
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver listado de clientes
          </Link>
        </header>

        <div className="overflow-x-auto pb-2">
          <div className="grid gap-4 lg:min-w-[1920px] lg:grid-cols-8">
            {estadosKanban.map((estado) => (
              <KanbanColumn
                key={estado}
                estado={estado}
                clientes={clientesPorEstado.get(estado) ?? []}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
