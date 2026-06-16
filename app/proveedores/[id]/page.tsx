import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { uploadDocumentoProveedor } from "@/app/proveedores/actions";
import { DeleteDocumentoProveedorForm } from "@/app/proveedores/delete-documento-proveedor-form";

const tiposDocumento = [
  "Catalogo",
  "Tarifa",
  "Ficha tecnica",
  "Condiciones comerciales",
  "Otro",
] as const;

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

async function getProveedor(id: number, documentosQuery: string) {
  return prisma.proveedor.findUnique({
    where: { id },
    include: {
      documentos: {
        where: documentosQuery
          ? {
              OR: [
                { nombre: { contains: documentosQuery, mode: "insensitive" } },
                { tipo: { contains: documentosQuery, mode: "insensitive" } },
                {
                  descripcion: {
                    contains: documentosQuery,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
      },
      actividades: {
        orderBy: { fecha: "desc" },
        take: 20,
      },
    },
  });
}

type ProveedorDetalle = NonNullable<Awaited<ReturnType<typeof getProveedor>>>;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function webHref(web?: string | null) {
  if (!web) {
    return null;
  }

  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
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

function DocumentoUploadForm({ proveedorId }: { proveedorId: number }) {
  return (
    <form
      action={uploadDocumentoProveedor}
      encType="multipart/form-data"
      className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      <input type="hidden" name="proveedorId" value={proveedorId} />
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nombre</span>
          <input
            className={inputClass}
            name="nombre"
            type="text"
            placeholder="Ejemplo: tarifa tableros 2026"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo</span>
          <select className={inputClass} name="tipo" defaultValue="Catalogo">
            {tiposDocumento.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Archivo</span>
        <input
          className={inputClass}
          name="archivo"
          type="file"
          accept=".pdf,.xlsx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripcion breve</span>
        <input
          className={inputClass}
          name="descripcion"
          type="text"
          maxLength={180}
          placeholder="Notas internas sobre este documento"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Subir documento
      </button>
    </form>
  );
}

function DocumentosSearchForm({
  proveedorId,
  query,
}: {
  proveedorId: number;
  query: string;
}) {
  return (
    <form
      action={`/proveedores/${proveedorId}`}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <input
        className={inputClass}
        name="dq"
        type="search"
        defaultValue={query}
        placeholder="Buscar documentos por nombre, tipo o descripcion"
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
            href={`/proveedores/${proveedorId}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function DocumentosSection({
  proveedor,
  query,
}: {
  proveedor: ProveedorDetalle;
  query: string;
}) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">DOCUMENTOS</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Catalogos, tarifas, fichas tecnicas y condiciones comerciales.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {proveedor.documentos.length} documentos
        </span>
      </div>

      <DocumentoUploadForm proveedorId={proveedor.id} />

      <div className="mt-5">
        <DocumentosSearchForm proveedorId={proveedor.id} query={query} />
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {proveedor.documentos.length > 0 ? (
              proveedor.documentos.map((documento) => (
                <tr key={documento.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-neutral-950">
                      {documento.nombre}
                    </p>
                    {documento.descripcion ? (
                      <p className="mt-1 text-neutral-600">
                        {documento.descripcion}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {documento.tipo}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatDateTime(documento.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatFileSize(documento.tamanoBytes)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <a
                        href={documento.archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Abrir
                      </a>
                      <a
                        href={documento.archivoUrl}
                        download
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Descargar
                      </a>
                      <DeleteDocumentoProveedorForm
                        proveedorId={proveedor.id}
                        documentoId={documento.id}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  {query
                    ? "No hay documentos con esa busqueda."
                    : "Todavia no hay documentos para este proveedor."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActividadSection({ proveedor }: { proveedor: ProveedorDetalle }) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">
            Historial de proveedor
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ultimas acciones sobre documentos del proveedor.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {proveedor.actividades.length} acciones
        </span>
      </div>
      {proveedor.actividades.length > 0 ? (
        <ol className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {proveedor.actividades.map((actividad) => (
            <li key={actividad.id} className="grid gap-1 px-4 py-3">
              <time className="text-sm font-semibold text-neutral-950">
                {formatDateTime(actividad.fecha)}
              </time>
              <p className="text-sm text-neutral-700">{actividad.descripcion}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          Todavia no hay actividad registrada para este proveedor.
        </p>
      )}
    </section>
  );
}

type ProveedorPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dq?: string | string[] }>;
};

export default async function ProveedorPage({
  params,
  searchParams,
}: ProveedorPageProps) {
  await connection();

  const [{ id: rawId }, search] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const queryParam = Array.isArray(search.dq) ? search.dq[0] : search.dq;
  const documentosQuery = queryParam?.trim() ?? "";
  const proveedor = await getProveedor(id, documentosQuery);
  if (!proveedor) {
    notFound();
  }

  const href = webHref(proveedor.web);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/proveedores"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a proveedores
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {proveedor.nombre}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Ficha de proveedor y documentacion.
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
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">
              Datos del proveedor
            </h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Código interno" value={proveedor.codigoInterno} />
            <DetailItem label="Categoria" value={proveedor.categoria} />
            <DetailItem label="Contacto" value={proveedor.contacto} />
            <DetailItem label="Telefono" value={proveedor.telefono} />
            <DetailItem label="Email" value={proveedor.email} />
            <DetailItem label="Direccion" value={proveedor.direccion} />
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Web
              </dt>
              <dd className="mt-2 text-sm font-medium text-neutral-950">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 transition hover:text-emerald-900"
                  >
                    {proveedor.web}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Observaciones
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {proveedor.observaciones || "-"}
            </p>
          </div>
        </section>

        <DocumentosSection proveedor={proveedor} query={documentosQuery} />

        <ActividadSection proveedor={proveedor} />
      </div>
    </main>
  );
}
