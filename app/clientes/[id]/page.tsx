import { randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const estadoStyles: Record<string, string> = {
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
const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
const fotoTipos = ["CLIENTE", "JUANSER"] as const;

type FotoTipo = (typeof fotoTipos)[number];

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

function requiredId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Cliente no valido.");
  }

  return id;
}

function requiredFotoTipo(formData: FormData) {
  const value = optionalString(formData, "tipo");
  if (!fotoTipos.includes(value as FotoTipo)) {
    throw new Error("Tipo de imagen no valido.");
  }

  return value as FotoTipo;
}

function requiredImageFile(formData: FormData) {
  const file = formData.get("imagen");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una imagen.");
  }

  if (file.size > maxImageSize) {
    throw new Error("La imagen no puede superar 5 MB.");
  }

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error("Solo se aceptan imagenes jpg, jpeg, png o webp.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("Extension de imagen no valida.");
  }

  return { file, extension };
}

function uploadFolder(tipo: FotoTipo) {
  return tipo === "CLIENTE" ? "cliente" : "juanser";
}

function publicUploadsDir(clienteId: number, tipo: FotoTipo) {
  return path.join(
    process.cwd(),
    "public",
    "uploads",
    "clientes",
    String(clienteId),
    uploadFolder(tipo),
  );
}

function publicUploadUrl(clienteId: number, tipo: FotoTipo, fileName: string) {
  return `/uploads/clientes/${clienteId}/${uploadFolder(tipo)}/${fileName}`;
}

function validatePublicUploadUrl(url: string, clienteId: number) {
  const expectedPrefix = `/uploads/clientes/${clienteId}/`;
  if (!url.startsWith(expectedPrefix) || path.isAbsolute(url)) {
    throw new Error("URL publica de imagen no valida.");
  }
}

function safeFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const safe = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safe || "imagen";
}

async function addSeguimiento(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const nota = requiredString(formData, "nota");

  await prisma.seguimiento.create({
    data: {
      clienteId,
      nota,
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

async function uploadFotoCliente(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const tipo = requiredFotoTipo(formData);
  const descripcion = optionalString(formData, "descripcion");
  const { file, extension } = requiredImageFile(formData);

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(
    file.name,
  )}.${extension}`;
  const relativeUrl = publicUploadUrl(clienteId, tipo, fileName);
  const uploadDir = publicUploadsDir(clienteId, tipo);
  const filePath = path.join(uploadDir, fileName);

  validatePublicUploadUrl(relativeUrl, clienteId);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(
    filePath,
    Buffer.from(await file.arrayBuffer()),
  );
  const savedFile = await stat(filePath);
  if (!savedFile.isFile() || savedFile.size === 0) {
    throw new Error("La imagen no se ha guardado correctamente.");
  }

  await prisma.fotoCliente.create({
    data: {
      clienteId,
      tipo,
      url: relativeUrl,
      nombreArchivo: file.name,
      descripcion,
    },
  });

  console.info("FotoCliente subida", {
    clienteId,
    tipo,
    url: relativeUrl,
    filePath,
    size: savedFile.size,
  });

  revalidatePath(`/clientes/${clienteId}`);
}

async function deleteFotoCliente(formData: FormData) {
  "use server";

  const clienteId = requiredId(formData, "clienteId");
  const fotoId = requiredId(formData, "fotoId");

  const foto = await prisma.fotoCliente.findFirst({
    where: {
      id: fotoId,
      clienteId,
    },
  });
  if (!foto) {
    throw new Error("Imagen no encontrada.");
  }

  const expectedPrefix = `/uploads/clientes/${clienteId}/`;
  if (foto.url.startsWith(expectedPrefix)) {
    const publicDir = path.resolve(process.cwd(), "public");
    const clienteUploadsDir = path.resolve(
      publicDir,
      "uploads",
      "clientes",
      String(clienteId),
    );
    const filePath = path.resolve(publicDir, foto.url.replace(/^\//, ""));
    if (filePath.startsWith(clienteUploadsDir)) {
      await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }
  }

  await prisma.fotoCliente.delete({
    where: { id: foto.id },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

async function getCliente(id: number) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      seguimientos: {
        orderBy: { fecha: "desc" },
      },
      fotos: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

type ClienteDetalle = NonNullable<Awaited<ReturnType<typeof getCliente>>>;

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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: ClienteDetalle["presupuesto"]) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function estadoClass(estado: string) {
  return estadoStyles[estado] ?? "bg-neutral-100 text-neutral-800 ring-neutral-200";
}

function isSeguimientoVencido(cliente: ClienteDetalle) {
  return Boolean(
    cliente.fechaSeguimiento &&
      cliente.fechaSeguimiento < startOfToday() &&
      cliente.estado !== "Instalado" &&
      cliente.estado !== "Perdido",
  );
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

function FotoUploadForm({ clienteId }: { clienteId: number }) {
  return (
    <form
      action={uploadFotoCliente}
      encType="multipart/form-data"
      className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo</span>
          <select className={inputClass} name="tipo" defaultValue="CLIENTE">
            <option value="CLIENTE">Imagen aportada por el cliente</option>
            <option value="JUANSER">Propuesta de Juanser</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Imagen</span>
          <input
            className={inputClass}
            name="imagen"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripcion breve</span>
        <input
          className={inputClass}
          name="descripcion"
          type="text"
          maxLength={180}
          placeholder="Ejemplo: hueco actual, render IA, acabado roble claro"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Subir imagen
      </button>
    </form>
  );
}

function FotosGaleria({
  cliente,
  tipo,
  title,
  subtitle,
}: {
  cliente: ClienteDetalle;
  tipo: FotoTipo;
  title: string;
  subtitle: string;
}) {
  const fotos = cliente.fotos.filter((foto) => foto.tipo === tipo);

  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {fotos.length} imagenes
        </span>
      </div>

      {fotos.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fotos.map((foto) => (
            <article
              key={foto.id}
              className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
            >
              <a href={foto.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.descripcion || foto.nombreArchivo}
                  className="h-44 w-full object-cover"
                />
              </a>
              <div className="grid gap-3 p-3">
                <div>
                  <p className="truncate text-sm font-semibold text-neutral-950">
                    {foto.nombreArchivo}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDateTime(foto.createdAt)}
                  </p>
                  {foto.descripcion ? (
                    <p className="mt-2 text-sm text-neutral-700">
                      {foto.descripcion}
                    </p>
                  ) : null}
                </div>
                <form action={deleteFotoCliente}>
                  <input type="hidden" name="clienteId" value={cliente.id} />
                  <input type="hidden" name="fotoId" value={foto.id} />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          No hay imagenes en esta seccion.
        </p>
      )}
    </section>
  );
}

function ClienteFicha({ cliente }: { cliente: ClienteDetalle }) {
  const seguimientoVencido = isSeguimientoVencido(cliente);

  return (
    <section className="grid gap-4">
      {seguimientoVencido ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-5 py-4 text-rose-950 shadow-sm">
          <p className="text-sm font-semibold">Seguimiento vencido</p>
          <p className="mt-1 text-sm">
            La fecha de seguimiento era el {formatDate(cliente.fechaSeguimiento)}.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Datos completos
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Informacion comercial y contacto del cliente.
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ring-1 ${estadoClass(
                cliente.estado,
              )}`}
            >
              {cliente.estado}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem label="Nombre" value={cliente.nombre} />
            <DetailItem label="Telefono" value={cliente.telefono} />
            <DetailItem label="Email" value={cliente.email} />
            <DetailItem label="Direccion" value={cliente.direccion} />
            <DetailItem label="Localidad" value={cliente.localidad} />
            <DetailItem label="Tipo de trabajo" value={cliente.tipoTrabajo} />
            <DetailItem
              label="Presupuesto"
              value={formatCurrency(cliente.presupuesto)}
            />
            <DetailItem label="Fecha de alta" value={formatDate(cliente.fechaAlta)} />
            <DetailItem
              label="Fecha de seguimiento"
              value={formatDate(cliente.fechaSeguimiento)}
            />
            <DetailItem label="Creado" value={formatDate(cliente.createdAt)} />
            <DetailItem label="Actualizado" value={formatDate(cliente.updatedAt)} />
          </dl>

          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Observaciones
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
              {cliente.observaciones || "-"}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Seguimientos</h2>
          <form action={addSeguimiento} className="mt-4 grid gap-3">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Nueva nota</span>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                name="nota"
                required
                placeholder="Anota llamada, visita, medicion o proximo paso"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Añadir seguimiento
            </button>
          </form>

          <div className="mt-5 overflow-hidden rounded-md border border-neutral-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {cliente.seguimientos.length > 0 ? (
                  cliente.seguimientos.map((seguimiento) => (
                    <tr key={seguimiento.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                        {formatDateTime(seguimiento.fecha)}
                      </td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-neutral-800">
                        {seguimiento.nota}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-neutral-500"
                    >
                      Todavia no hay notas de seguimiento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-neutral-950">
            Gestion de imagenes
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Sube fotos del cliente o propuestas visuales de Juanser.
          </p>
        </div>
        <FotoUploadForm clienteId={cliente.id} />
      </section>

      <FotosGaleria
        cliente={cliente}
        tipo="CLIENTE"
        title="Imagenes del cliente"
        subtitle="Fotos del hueco actual, muebles a reparar, medidas, ideas o referencias."
      />
      <FotosGaleria
        cliente={cliente}
        tipo="JUANSER"
        title="Propuestas de Juanser"
        subtitle="Renders IA, bocetos, disenos, acabados y simulaciones."
      />
    </section>
  );
}

type ClientePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientePage({ params }: ClientePageProps) {
  await connection();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const cliente = await getCliente(id);
  if (!cliente) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/clientes"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al listado
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {cliente.nombre}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Ficha comercial individual
            </p>
          </div>
        </header>

        <ClienteFicha cliente={cliente} />
      </div>
    </main>
  );
}
