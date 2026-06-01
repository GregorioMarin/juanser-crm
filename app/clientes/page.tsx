import Link from "next/link";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

const estados = [
  "Nuevo lead",
  "Contactado",
  "Presupuesto enviado",
  "Aceptado",
  "En curso",
  "Finalizado",
  "Archivado",
];

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

async function createCliente(formData: FormData) {
  "use server";

  await prisma.cliente.create({
    data: {
      nombre: requiredString(formData, "nombre"),
      telefono: optionalString(formData, "telefono"),
      email: optionalString(formData, "email"),
      direccion: optionalString(formData, "direccion"),
      localidad: optionalString(formData, "localidad"),
      tipoTrabajo: optionalString(formData, "tipoTrabajo"),
      estado: optionalString(formData, "estado") ?? "Nuevo lead",
      observaciones: optionalString(formData, "observaciones"),
    },
  });

  revalidatePath("/clientes");
}

async function updateCliente(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Cliente no valido.");
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      nombre: requiredString(formData, "nombre"),
      telefono: optionalString(formData, "telefono"),
      email: optionalString(formData, "email"),
      direccion: optionalString(formData, "direccion"),
      localidad: optionalString(formData, "localidad"),
      tipoTrabajo: optionalString(formData, "tipoTrabajo"),
      estado: optionalString(formData, "estado") ?? "Nuevo lead",
      observaciones: optionalString(formData, "observaciones"),
    },
  });

  revalidatePath("/clientes");
}

async function getClientes() {
  return prisma.cliente.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

type Cliente = Awaited<ReturnType<typeof getClientes>>[number];

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
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
      />
    </label>
  );
}

function EstadoSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>Estado</span>
      <select
        className={inputClass}
        name="estado"
        defaultValue={defaultValue ?? "Nuevo lead"}
      >
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-neutral-950">
        Todavia no hay clientes
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Crea el primer registro desde el formulario superior.
      </p>
    </div>
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
        <dt className="font-medium text-neutral-500">Email</dt>
        <dd>{cliente.email || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Direccion</dt>
        <dd>{cliente.direccion || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Localidad</dt>
        <dd>{cliente.localidad || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Tipo de trabajo</dt>
        <dd>{cliente.tipoTrabajo || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Actualizado</dt>
        <dd>{formatDate(cliente.updatedAt)}</dd>
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
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Trabajo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Actualizado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-semibold text-neutral-950">{cliente.nombre}</p>
                <p className="mt-1 text-neutral-500">{cliente.localidad || "-"}</p>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                <p>{cliente.telefono || "-"}</p>
                <p className="mt-1">{cliente.email || "-"}</p>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.tipoTrabajo || "-"}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                  {cliente.estado}
                </span>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {formatDate(cliente.updatedAt)}
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
              <h2 className="text-lg font-semibold text-neutral-950">
                {cliente.nombre}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {cliente.localidad || "Sin localidad"}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
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

export default async function ClientesPage() {
  await connection();

  const clientes = await getClientes();

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
              Clientes
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {clientes.length} registros en cartera
            </p>
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nuevo cliente
            </h2>
          </div>
          <ClienteForm action={createCliente} submitLabel="Crear cliente" />
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
          </div>
          {clientes.length > 0 ? (
            <>
              <ClientesTable clientes={clientes} />
              <ClientesCards clientes={clientes} />
            </>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  );
}
