import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  updateTrabajo,
  uploadTrabajoMedia,
} from "@/app/trabajos/actions";
import { DeleteTrabajoForm } from "@/app/trabajos/delete-trabajo-form";
import { DeleteTrabajoMediaForm } from "@/app/trabajos/delete-trabajo-media-form";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

async function getTrabajo(id: number) {
  return prisma.trabajoTerminado.findUnique({
    where: { id },
    include: {
      media: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

type TrabajoDetalle = NonNullable<Awaited<ReturnType<typeof getTrabajo>>>;
type TrabajoMedia = TrabajoDetalle["media"][number];
type MediaCategoria = "ANTES" | "DESPUES" | "VIDEO";

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function formatDate(date: Date) {
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

function formatFileSize(bytes?: number | null) {
  if (!bytes) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-neutral-950">{value || "-"}</dd>
    </div>
  );
}

function TrabajoEditForm({ trabajo }: { trabajo: TrabajoDetalle }) {
  return (
    <form action={updateTrabajo} className="grid gap-4">
      <input type="hidden" name="trabajoId" value={trabajo.id} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Titulo</span>
          <input
            className={inputClass}
            name="titulo"
            defaultValue={trabajo.titulo}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cliente</span>
          <input
            className={inputClass}
            name="clienteNombre"
            defaultValue={trabajo.clienteNombre ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Localidad</span>
          <input
            className={inputClass}
            name="localidad"
            defaultValue={trabajo.localidad}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo de trabajo</span>
          <input
            className={inputClass}
            name="tipoTrabajo"
            defaultValue={trabajo.tipoTrabajo}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Importe</span>
          <input
            className={inputClass}
            name="importe"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(trabajo.importe).toFixed(2)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fecha</span>
          <input
            className={inputClass}
            name="fechaTrabajo"
            type="date"
            defaultValue={toDateInputValue(trabajo.fechaTrabajo)}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripcion</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          name="descripcion"
          defaultValue={trabajo.descripcion}
          required
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
        <input
          name="destacadoWeb"
          type="checkbox"
          defaultChecked={trabajo.destacadoWeb}
          className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
        />
        Destacado web
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Guardar cambios
      </button>
    </form>
  );
}

function MediaUploadForm({ trabajoId }: { trabajoId: number }) {
  return (
    <form
      action={uploadTrabajoMedia}
      encType="multipart/form-data"
      className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Seccion</span>
          <select className={inputClass} name="categoria" defaultValue="DESPUES">
            <option value="ANTES">Fotos antes</option>
            <option value="DESPUES">Fotos despues</option>
            <option value="VIDEO">Videos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Archivo</span>
          <input
            className={inputClass}
            name="archivo"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
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
          placeholder="Ejemplo: antes de reparar, acabado final, video de apertura"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Subir archivo
      </button>
    </form>
  );
}

function MediaCard({
  trabajoId,
  media,
}: {
  trabajoId: number;
  media: TrabajoMedia;
}) {
  const isVideo = media.tipoArchivo === "VIDEO";

  return (
    <article className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
      {isVideo ? (
        <video
          controls
          preload="metadata"
          src={media.url}
          className="h-48 w-full bg-neutral-950 object-contain"
        />
      ) : (
        <a href={media.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt={media.descripcion || media.nombreArchivo}
            className="h-48 w-full object-cover"
          />
        </a>
      )}
      <div className="grid gap-3 p-3">
        <div>
          <p className="truncate text-sm font-semibold text-neutral-950">
            {media.nombreArchivo}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {formatDateTime(media.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-neutral-200 px-2 py-1 text-neutral-700">
              {isVideo ? "Video" : "Imagen"}
            </span>
            <span className="rounded-full bg-neutral-200 px-2 py-1 text-neutral-700">
              {formatFileSize(media.tamanoBytes)}
            </span>
          </div>
          {media.descripcion ? (
            <p className="mt-2 text-sm text-neutral-700">{media.descripcion}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Abrir
          </a>
          <DeleteTrabajoMediaForm trabajoId={trabajoId} mediaId={media.id} />
        </div>
      </div>
    </article>
  );
}

function MediaSection({
  trabajo,
  categoria,
  title,
  subtitle,
}: {
  trabajo: TrabajoDetalle;
  categoria: MediaCategoria;
  title: string;
  subtitle: string;
}) {
  const archivos = trabajo.media.filter((media) => media.categoria === categoria);

  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {archivos.length} archivos
        </span>
      </div>
      {archivos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {archivos.map((media) => (
            <MediaCard key={media.id} trabajoId={trabajo.id} media={media} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          Todavia no hay archivos en esta seccion.
        </p>
      )}
    </section>
  );
}

type TrabajoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrabajoPage({ params }: TrabajoPageProps) {
  await connection();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const trabajo = await getTrabajo(id);
  if (!trabajo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/trabajos"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a trabajos
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              {trabajo.titulo}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {trabajo.localidad} · {trabajo.tipoTrabajo} ·{" "}
              {formatDate(trabajo.fechaTrabajo)}
            </p>
          </div>
          <DeleteTrabajoForm trabajoId={trabajo.id} />
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <DetailItem label="Localidad" value={trabajo.localidad} />
          <DetailItem label="Tipo" value={trabajo.tipoTrabajo} />
          <DetailItem label="Importe" value={formatCurrency(trabajo.importe)} />
          <DetailItem
            label="Destacado web"
            value={trabajo.destacadoWeb ? "Si" : "No"}
          />
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">
              Editar trabajo
            </h2>
          </div>
          <TrabajoEditForm trabajo={trabajo} />
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">
                Multimedia
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Fotos antes, fotos despues y videos del trabajo terminado.
              </p>
            </div>
            <span className="text-sm font-semibold text-neutral-700">
              {trabajo.media.length} archivos
            </span>
          </div>
          <MediaUploadForm trabajoId={trabajo.id} />
        </section>

        <MediaSection
          trabajo={trabajo}
          categoria="ANTES"
          title="Fotos antes"
          subtitle="Estado inicial, hueco, mueble o zona antes del trabajo."
        />
        <MediaSection
          trabajo={trabajo}
          categoria="DESPUES"
          title="Fotos despues"
          subtitle="Resultado final y detalles listos para reutilizar."
        />
        <MediaSection
          trabajo={trabajo}
          categoria="VIDEO"
          title="Videos"
          subtitle="Recorridos, funcionamiento, mecanismos o montaje final."
        />
      </div>
    </main>
  );
}
