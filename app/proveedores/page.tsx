import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { createProveedor, updateProveedor } from "@/app/proveedores/actions";
import { DeleteProveedorForm } from "@/app/proveedores/delete-proveedor-form";

const categoriasProveedor = [
  "Tableros",
  "Herrajes",
  "Puertas",
  "Cristales",
  "Lacados",
  "Barnices",
  "Encimeras",
  "Otros",
] as const;

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

async function getProveedores(query: string) {
  return prisma.proveedor.findMany({
    where: query
      ? {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { categoria: { contains: query, mode: "insensitive" } },
            { contacto: { contains: query, mode: "insensitive" } },
            { telefono: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });
}

type Proveedor = Awaited<ReturnType<typeof getProveedores>>[number];

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

function CategoriaSelect({ defaultValue }: { defaultValue?: string | null }) {
  const current = categoriasProveedor.includes(
    defaultValue as (typeof categoriasProveedor)[number],
  )
    ? (defaultValue as (typeof categoriasProveedor)[number])
    : "Otros";

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>Categoría</span>
      <select className={inputClass} name="categoria" defaultValue={current}>
        {categoriasProveedor.map((categoria) => (
          <option key={categoria} value={categoria}>
            {categoria}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProveedorForm({
  action,
  proveedor,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  proveedor?: Proveedor;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4">
      {proveedor ? (
        <input type="hidden" name="proveedorId" value={proveedor.id} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Nombre"
          name="nombre"
          defaultValue={proveedor?.nombre}
          required
        />
        <CategoriaSelect defaultValue={proveedor?.categoria} />
        <Field
          label="Contacto"
          name="contacto"
          defaultValue={proveedor?.contacto}
        />
        <Field
          label="Teléfono"
          name="telefono"
          type="tel"
          defaultValue={proveedor?.telefono}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={proveedor?.email}
        />
        <Field label="Web" name="web" defaultValue={proveedor?.web} />
        <Field
          label="Dirección"
          name="direccion"
          defaultValue={proveedor?.direccion}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Observaciones</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="observaciones"
          defaultValue={proveedor?.observaciones ?? ""}
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <form action="/proveedores" className="flex flex-col gap-3 sm:flex-row">
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por nombre, categoría, contacto o teléfono"
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
            href="/proveedores"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function webHref(web?: string | null) {
  if (!web) {
    return null;
  }

  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
}

function ProveedorDetails({ proveedor }: { proveedor: Proveedor }) {
  const href = webHref(proveedor.web);

  return (
    <dl className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
      <div>
        <dt className="font-medium text-neutral-500">Categoría</dt>
        <dd>{proveedor.categoria || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Contacto</dt>
        <dd>{proveedor.contacto || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Teléfono</dt>
        <dd>{proveedor.telefono || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Email</dt>
        <dd>{proveedor.email || "-"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="font-medium text-neutral-500">Web</dt>
        <dd>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              {proveedor.web}
            </a>
          ) : (
            "-"
          )}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="font-medium text-neutral-500">Dirección</dt>
        <dd>{proveedor.direccion || "-"}</dd>
      </div>
    </dl>
  );
}

function ProveedoresTable({ proveedores }: { proveedores: Proveedor[] }) {
  return (
    <div className="hidden overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Categoría</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Web</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {proveedores.map((proveedor) => {
            const href = webHref(proveedor.web);

            return (
              <tr key={proveedor.id} className="align-top">
                <td className="px-4 py-4">
                  <Link
                    href={`/proveedores/${proveedor.id}`}
                    className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                  >
                    {proveedor.nombre}
                  </Link>
                  <p className="mt-1 text-neutral-500">
                    {proveedor.direccion || "-"}
                  </p>
                  {proveedor.observaciones ? (
                    <p className="mt-2 whitespace-pre-wrap text-neutral-600">
                      {proveedor.observaciones}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {proveedor.categoria || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {proveedor.contacto || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {proveedor.telefono || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {proveedor.email || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                    >
                      {proveedor.web}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex flex-col items-end gap-2">
                    <details className="group">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">
                        Editar
                      </summary>
                      <div className="mt-4 w-[720px] max-w-[80vw] rounded-md border border-neutral-200 bg-neutral-50 p-4 text-left">
                        <ProveedorForm
                          action={updateProveedor}
                          proveedor={proveedor}
                          submitLabel="Guardar cambios"
                        />
                      </div>
                    </details>
                    <Link
                      href={`/proveedores/${proveedor.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Abrir ficha
                    </Link>
                    <DeleteProveedorForm proveedorId={proveedor.id} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProveedoresCards({ proveedores }: { proveedores: Proveedor[] }) {
  return (
    <div className="grid gap-4 lg:hidden">
      {proveedores.map((proveedor) => (
        <article
          key={proveedor.id}
          className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/proveedores/${proveedor.id}`}
                className="text-lg font-semibold text-neutral-950 transition hover:text-emerald-800"
              >
                {proveedor.nombre}
              </Link>
              <p className="mt-1 text-sm text-neutral-500">
                {proveedor.categoria || "-"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ProveedorDetails proveedor={proveedor} />
          </div>
          {proveedor.observaciones ? (
            <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-700">
              {proveedor.observaciones}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <details>
              <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">
                Editar
              </summary>
              <div className="mt-4 rounded-md bg-neutral-50 p-4">
                <ProveedorForm
                  action={updateProveedor}
                  proveedor={proveedor}
                  submitLabel="Guardar cambios"
                />
              </div>
            </details>
            <Link
              href={`/proveedores/${proveedor.id}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Abrir ficha
            </Link>
            <DeleteProveedorForm proveedorId={proveedor.id} />
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-neutral-950">
        {hasSearch
          ? "No hay proveedores con esa búsqueda"
          : "Todavía no hay proveedores"}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {hasSearch
          ? "Prueba con otro nombre, categoría, contacto o teléfono."
          : "Crea el primer proveedor desde el formulario superior."}
      </p>
    </div>
  );
}

type ProveedoresPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function ProveedoresPage({
  searchParams,
}: ProveedoresPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = queryParam?.trim() ?? "";
  const proveedores = await getProveedores(query);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
              Proveedores
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {proveedores.length} proveedores visibles.
            </p>
          </div>
          <Link
            href="/clientes"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver clientes
          </Link>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nuevo proveedor
            </h2>
          </div>
          <ProveedorForm
            action={createProveedor}
            submitLabel="Crear proveedor"
          />
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(320px,560px)] md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Directorio de compras y colaboradores por categoría.
              </p>
            </div>
            <SearchForm query={query} />
          </div>

          {proveedores.length > 0 ? (
            <>
              <ProveedoresTable proveedores={proveedores} />
              <ProveedoresCards proveedores={proveedores} />
            </>
          ) : (
            <EmptyState hasSearch={Boolean(query)} />
          )}
        </section>
      </div>
    </main>
  );
}
