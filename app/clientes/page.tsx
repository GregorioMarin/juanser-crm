import Link from "next/link";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { prisma } from "@/app/lib/prisma";

const estados = [
  "Nuevo lead",
  "Visitado",
  "Presupuesto enviado",
  "Aceptado",
  "En fabricación",
  "Instalado",
  "Perdido",
] as const;

const estadoStyles: Record<(typeof estados)[number], string> = {
  "Nuevo lead": "bg-sky-100 text-sky-900 ring-sky-200",
  Visitado: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  "Presupuesto enviado": "bg-amber-100 text-amber-950 ring-amber-200",
  Aceptado: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  "En fabricación": "bg-violet-100 text-violet-900 ring-violet-200",
  Instalado: "bg-teal-100 text-teal-900 ring-teal-200",
  Perdido: "bg-rose-100 text-rose-900 ring-rose-200",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`El campo ${key} es obligatorio.`);
  }

  return value;
}

function estadoValue(formData: FormData) {
  const value = optionalString(formData, "estado") ?? "Nuevo lead";
  if (!estados.includes(value as (typeof estados)[number])) {
    throw new Error("Estado no valido.");
  }

  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function presupuestoValue(formData: FormData) {
  const value = optionalString(formData, "presupuesto");
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("El presupuesto debe ser un importe valido.");
  }

  return normalized;
}

function clienteData(formData: FormData) {
  return {
    nombre: requiredString(formData, "nombre"),
    telefono: optionalString(formData, "telefono"),
    email: optionalString(formData, "email"),
    direccion: optionalString(formData, "direccion"),
    localidad: optionalString(formData, "localidad"),
    tipoTrabajo: optionalString(formData, "tipoTrabajo"),
    presupuesto: presupuestoValue(formData),
    fechaAlta: optionalDate(formData, "fechaAlta") ?? new Date(),
    fechaSeguimiento: optionalDate(formData, "fechaSeguimiento"),
    estado: estadoValue(formData),
    observaciones: optionalString(formData, "observaciones"),
  };
}

async function createCliente(formData: FormData) {
  "use server";

  const cliente = await prisma.cliente.create({
    data: clienteData(formData),
  });
  await registrarActividadCliente({
    clienteId: cliente.id,
    tipo: "CLIENTE_CREADO",
    descripcion: "Cliente creado",
  });

  revalidatePath("/clientes");
}

async function updateCliente(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Cliente no valido.");
  }

  const data = clienteData(formData);
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  await prisma.cliente.update({
    where: { id },
    data,
  });

  if (cliente.estado !== data.estado) {
    await registrarActividadCliente({
      clienteId: id,
      tipo: "ESTADO_CAMBIADO",
      descripcion: `Estado cambiado de ${cliente.estado} a ${data.estado}`,
    });
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

async function getClientes(query: string) {
  return prisma.cliente.findMany({
    where: query
      ? {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { telefono: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { fechaAlta: "desc" },
  });
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

async function getSeguimientosPendientes() {
  return prisma.cliente.findMany({
    where: {
      fechaSeguimiento: {
        lte: endOfToday(),
      },
      estado: {
        notIn: ["Instalado", "Perdido"],
      },
    },
    orderBy: { fechaSeguimiento: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      estado: true,
      fechaSeguimiento: true,
    },
  });
}

async function getSeguimientosFuturos() {
  return prisma.cliente.findMany({
    where: {
      fechaSeguimiento: {
        gt: endOfToday(),
      },
      estado: {
        notIn: ["Instalado", "Perdido"],
      },
    },
    orderBy: { fechaSeguimiento: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      estado: true,
      fechaSeguimiento: true,
    },
  });
}

async function getResumen() {
  const [
    leads,
    presupuestosEnviados,
    aceptados,
    enFabricacion,
    instalados,
    totalPresupuestado,
    totalAceptado,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { estado: "Presupuesto enviado" } }),
    prisma.cliente.count({ where: { estado: "Aceptado" } }),
    prisma.cliente.count({ where: { estado: "En fabricación" } }),
    prisma.cliente.count({ where: { estado: "Instalado" } }),
    prisma.presupuesto.aggregate({ _sum: { totalConIva: true } }),
    prisma.presupuesto.aggregate({
      where: { estado: "ACEPTADO" },
      _sum: { totalConIva: true },
    }),
  ]);

  return {
    leads,
    presupuestosEnviados,
    aceptados,
    enFabricacion,
    instalados,
    totalPresupuestado: totalPresupuestado._sum.totalConIva,
    totalAceptado: totalAceptado._sum.totalConIva,
  };
}

type Cliente = Awaited<ReturnType<typeof getClientes>>[number];
type SeguimientoPendiente = Awaited<
  ReturnType<typeof getSeguimientosPendientes>
>[number];
type SeguimientoFuturo = Awaited<ReturnType<typeof getSeguimientosFuturos>>[number];
type Resumen = Awaited<ReturnType<typeof getResumen>>;

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
      />
    </label>
  );
}

function EstadoSelect({ defaultValue }: { defaultValue?: string | null }) {
  const current: (typeof estados)[number] = estados.includes(
    defaultValue as (typeof estados)[number],
  )
    ? (defaultValue as (typeof estados)[number])
    : "Nuevo lead";

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>Estado</span>
      <select className={inputClass} name="estado" defaultValue={current}>
        {estados.map((estado) => (
          <option key={estado} value={estado}>
            {estado}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClienteForm({
  action,
  cliente,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  cliente?: Cliente;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Nombre"
          name="nombre"
          defaultValue={cliente?.nombre}
          required
        />
        <Field
          label="Telefono"
          name="telefono"
          type="tel"
          defaultValue={cliente?.telefono}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={cliente?.email}
        />
        <Field
          label="Direccion"
          name="direccion"
          defaultValue={cliente?.direccion}
        />
        <Field
          label="Localidad"
          name="localidad"
          defaultValue={cliente?.localidad}
        />
        <Field
          label="Tipo de trabajo"
          name="tipoTrabajo"
          defaultValue={cliente?.tipoTrabajo}
        />
        <Field
          label="Presupuesto (€)"
          name="presupuesto"
          type="number"
          step="0.01"
          defaultValue={cliente?.presupuesto?.toString()}
        />
        <Field
          label="Fecha de alta"
          name="fechaAlta"
          type="date"
          defaultValue={toDateInputValue(cliente?.fechaAlta)}
        />
        <Field
          label="Fecha de seguimiento"
          name="fechaSeguimiento"
          type="date"
          defaultValue={toDateInputValue(cliente?.fechaSeguimiento)}
        />
        <EstadoSelect defaultValue={cliente?.estado} />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Observaciones</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="observaciones"
          defaultValue={cliente?.observaciones ?? ""}
        />
      </label>
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function toDateInputValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

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

function estadoClass(estado: string) {
  return (
    estadoStyles[estado as (typeof estados)[number]] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function isVencido(date?: Date | null) {
  return Boolean(date && date < startOfToday());
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-neutral-950">
        {hasSearch ? "No hay clientes con esa busqueda" : "Todavia no hay clientes"}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {hasSearch
          ? "Prueba con otro nombre o telefono."
          : "Crea el primer registro desde el formulario superior."}
      </p>
    </div>
  );
}

function SeguimientosPendientes({
  clientes,
}: {
  clientes: SeguimientoPendiente[];
}) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Seguimientos pendientes
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Clientes con seguimiento para hoy o ya vencido.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {clientes.length} pendientes
        </span>
      </div>

      {clientes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Seguimiento</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {clientes.map((cliente) => {
                const vencido = isVencido(cliente.fechaSeguimiento);

                return (
                  <tr
                    key={cliente.id}
                    className={vencido ? "bg-rose-50 align-top" : "align-top"}
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                      >
                        {cliente.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-neutral-700">
                      {cliente.telefono || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                          cliente.estado,
                        )}`}
                      >
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={
                          vencido
                            ? "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 ring-1 ring-rose-200"
                            : "text-neutral-700"
                        }
                      >
                        {formatDate(cliente.fechaSeguimiento)}
                        {vencido ? " - Urgente" : ""}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-neutral-500">
          No hay seguimientos pendientes para hoy.
        </p>
      )}
    </section>
  );
}

function SeguimientosFuturos({ clientes }: { clientes: SeguimientoFuturo[] }) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Seguimientos futuros
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Proximas llamadas, visitas o revisiones comerciales.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {clientes.length} futuros
        </span>
      </div>

      {clientes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Seguimiento</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                    >
                      {cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {cliente.telefono || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                        cliente.estado,
                      )}`}
                    >
                      {cliente.estado}
                    </span>
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
      ) : (
        <p className="px-5 py-6 text-sm text-neutral-500">
          No hay seguimientos futuros programados.
        </p>
      )}
    </section>
  );
}

function ResumenComercial({ resumen }: { resumen: Resumen }) {
  const items = [
    ["Leads", resumen.leads],
    ["Presupuestos enviados", resumen.presupuestosEnviados],
    ["Aceptados", resumen.aceptados],
    ["En fabricacion", resumen.enFabricacion],
    ["Instalados", resumen.instalados],
    ["Total presupuestado", formatCurrency(resumen.totalPresupuestado)],
    ["Total aceptado", formatCurrency(resumen.totalAceptado)],
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
        </div>
      ))}
    </section>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <form action="/clientes" className="flex flex-col gap-3 sm:flex-row">
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por nombre o telefono"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Buscar
        </button>
        {query ? (
          <Link
            href="/clientes"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function ClienteDetails({ cliente }: { cliente: Cliente }) {
  return (
    <dl className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
      <div>
        <dt className="font-medium text-neutral-500">Telefono</dt>
        <dd>{cliente.telefono || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Presupuesto</dt>
        <dd>{formatCurrency(cliente.presupuesto)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Alta</dt>
        <dd>{formatDate(cliente.fechaAlta)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Seguimiento</dt>
        <dd>{formatDate(cliente.fechaSeguimiento)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Trabajo</dt>
        <dd>{cliente.tipoTrabajo || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Localidad</dt>
        <dd>{cliente.localidad || "-"}</dd>
      </div>
    </dl>
  );
}

function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  return (
    <div className="hidden overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Alta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Telefono</th>
            <th className="px-4 py-3">Trabajo</th>
            <th className="px-4 py-3">Presupuesto</th>
            <th className="px-4 py-3">Seguimiento</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
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
                <p className="mt-1 text-neutral-500">{cliente.localidad || "-"}</p>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.telefono || "-"}
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.tipoTrabajo || "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                {formatCurrency(cliente.presupuesto)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaSeguimiento)}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                    cliente.estado,
                  )}`}
                >
                  {cliente.estado}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <details className="group">
                  <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">
                    Editar
                  </summary>
                  <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-left">
                    <ClienteForm
                      action={updateCliente}
                      cliente={cliente}
                      submitLabel="Guardar cambios"
                    />
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientesCards({ clientes }: { clientes: Cliente[] }) {
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
            <span
              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                cliente.estado,
              )}`}
            >
              {cliente.estado}
            </span>
          </div>
          <div className="mt-4">
            <ClienteDetails cliente={cliente} />
          </div>
          {cliente.observaciones ? (
            <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-700">
              {cliente.observaciones}
            </p>
          ) : null}
          <details className="mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">
              Editar
            </summary>
            <div className="mt-4 rounded-md bg-neutral-50 p-4">
              <ClienteForm
                action={updateCliente}
                cliente={cliente}
                submitLabel="Guardar cambios"
              />
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}

type ClientesPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = queryParam?.trim() ?? "";
  const [clientes, seguimientosPendientes, seguimientosFuturos, resumen] =
    await Promise.all([
      getClientes(query),
      getSeguimientosPendientes(),
      getSeguimientosFuturos(),
      getResumen(),
    ]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al panel
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Gestor comercial Carpinteria Juanser
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {clientes.length} registros visibles ordenados por fecha de alta
            </p>
          </div>
          <Link
            href="/presupuestos"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver presupuestos
          </Link>
        </header>

        <ResumenComercial resumen={resumen} />

        <SeguimientosPendientes clientes={seguimientosPendientes} />

        <SeguimientosFuturos clientes={seguimientosFuturos} />

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nuevo cliente
            </h2>
          </div>
          <ClienteForm action={createCliente} submitLabel="Crear cliente" />
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(320px,520px)] md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Tabla comercial por fecha, estado y seguimiento.
              </p>
            </div>
            <SearchForm query={query} />
          </div>
          {clientes.length > 0 ? (
            <>
              <ClientesTable clientes={clientes} />
              <ClientesCards clientes={clientes} />
            </>
          ) : (
            <EmptyState hasSearch={Boolean(query)} />
          )}
        </section>
      </div>
    </main>
  );
}
