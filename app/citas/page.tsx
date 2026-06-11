import Link from "next/link";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import {
  EmailContactAction,
  PhoneContactActions,
} from "@/app/contact-actions";
import { convertirCitaEnCliente } from "./actions";
import { clienteCreadoMarker } from "./constants";
import { getCitas } from "./data";
import { DeleteCitaForm } from "./delete-cita-form";
import { EditCitaForm } from "./edit-cita-form";
import {
  citaLines,
  citaEstados,
  citaNotaVisible,
  citaServicio,
  isCitasPendientesFilter,
  type CitaEstadoNormalizado,
} from "./helpers";
import { prisma } from "@/app/lib/prisma";

const estadoStyles: Record<CitaEstadoNormalizado, string> = {
  PENDIENTE: "bg-amber-100 text-amber-950 ring-amber-200",
  CONFIRMADA: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CANCELADA: "bg-rose-100 text-rose-900 ring-rose-200",
  REALIZADA: "bg-sky-100 text-sky-900 ring-sky-200",
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

function requiredDateTime(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function estadoValue(formData: FormData) {
  const value = optionalString(formData, "estado") ?? "PENDIENTE";
  if (!citaEstados.includes(value as CitaEstadoNormalizado)) {
    throw new Error("Estado de cita no valido.");
  }

  return value as CitaEstadoNormalizado;
}

async function createCitaManual(formData: FormData) {
  "use server";

  await prisma.cita.create({
    data: {
      clienteNombre: requiredString(formData, "clienteNombre"),
      telefono: optionalString(formData, "telefono"),
      email: optionalString(formData, "email"),
      fechaHora: requiredDateTime(formData, "fechaHora"),
      origen: "MANUAL",
      estado: estadoValue(formData),
      nota: optionalString(formData, "nota"),
    },
  });

  revalidatePath("/citas");
  revalidatePath("/clientes");
  revalidatePath("/");
}

type Cita = Awaited<ReturnType<typeof getCitas>>[number];

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input className={inputClass} name={name} type={type} required={required} />
    </label>
  );
}

function EstadoSelect() {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>Estado</span>
      <select className={inputClass} name="estado" defaultValue="PENDIENTE">
        {citaEstados.map((estado) => (
          <option key={estado} value={estado}>
            {estado}
          </option>
        ))}
      </select>
    </label>
  );
}

function CitaForm() {
  return (
    <form action={createCitaManual} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Cliente" name="clienteNombre" required />
        <Field label="Telefono" name="telefono" type="tel" />
        <Field label="Email" name="email" type="email" />
        <Field label="Fecha y hora" name="fechaHora" type="datetime-local" required />
        <EstadoSelect />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Nota</span>
        <textarea className={`${inputClass} min-h-24 resize-y`} name="nota" />
      </label>
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Añadir cita
        </button>
      </div>
    </form>
  );
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

function formatDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function estadoClass(estado: string) {
  return (
    estadoStyles[estado as CitaEstadoNormalizado] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function citaProcesada(cita: Cita) {
  return citaLines(cita.nota).includes(clienteCreadoMarker);
}

function citaEditData(cita: Cita) {
  return {
    id: cita.id,
    clienteNombre: cita.clienteNombre,
    telefono: cita.telefono,
    email: cita.email,
    fechaHora: formatDateTimeInput(cita.fechaHora),
    estado: cita.estado as CitaEstadoNormalizado,
    servicio: citaServicio(cita.nota),
    nota: citaNotaVisible(cita.nota, [clienteCreadoMarker]),
  };
}

function ConvertirCitaForm({ cita, processed }: { cita: Cita; processed: boolean }) {
  return (
    <form action={convertirCitaEnCliente}>
      <input type="hidden" name="citaId" value={cita.id} />
      <button
        type="submit"
        disabled={processed}
        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
      >
        {processed ? clienteCreadoMarker : "Convertir en cliente"}
      </button>
    </form>
  );
}

function CitasTable({ citas }: { citas: Cita[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-neutral-300 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Servicio</th>
            <th className="px-4 py-3">Contacto</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Nota</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {citas.map((cita) => {
            const processed = citaProcesada(cita);

            return (
              <tr key={cita.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                  {formatDateTime(cita.fechaHora)}
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-neutral-950">{cita.clienteNombre}</p>
                  {cita.ameliaBookingId ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      Amelia #{cita.ameliaBookingId}
                    </p>
                  ) : null}
                  {processed ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      {clienteCreadoMarker}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  {citaServicio(cita.nota) || "-"}
                </td>
                <td className="px-4 py-4 text-neutral-700">
                  <PhoneContactActions telefono={cita.telefono} />
                  <div className="mt-1 text-neutral-500">
                    <EmailContactAction email={cita.email} />
                  </div>
                </td>
                <td className="px-4 py-4 text-neutral-700">{cita.origen}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                      cita.estado,
                    )}`}
                  >
                    {cita.estado}
                  </span>
                </td>
                <td className="max-w-sm whitespace-pre-line px-4 py-4 text-neutral-700">
                  {citaNotaVisible(cita.nota, [clienteCreadoMarker]) || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <EditCitaForm cita={citaEditData(cita)} />
                    <ConvertirCitaForm cita={cita} processed={processed} />
                    <DeleteCitaForm citaId={cita.id} />
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

function CitasCards({ citas }: { citas: Cita[] }) {
  return (
    <div className="grid gap-4 lg:hidden">
      {citas.map((cita) => {
        const processed = citaProcesada(cita);

        return (
          <article
            key={cita.id}
            className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-neutral-950">
                  {cita.clienteNombre}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatDateTime(cita.fechaHora)}
                </p>
                {cita.ameliaBookingId ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Amelia #{cita.ameliaBookingId}
                  </p>
                ) : null}
                {processed ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {clienteCreadoMarker}
                  </p>
                ) : null}
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estadoClass(
                  cita.estado,
                )}`}
              >
                {cita.estado}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-neutral-500">Servicio</dt>
                <dd>{citaServicio(cita.nota) || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">Telefono</dt>
                <dd>
                  <PhoneContactActions telefono={cita.telefono} />
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">Email</dt>
                <dd>
                  <EmailContactAction email={cita.email} />
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-500">Origen</dt>
                <dd>{cita.origen}</dd>
              </div>
            </dl>
            {citaNotaVisible(cita.nota, [clienteCreadoMarker]) ? (
              <p className="mt-4 whitespace-pre-line border-t border-neutral-200 pt-4 text-sm text-neutral-700">
                {citaNotaVisible(cita.nota, [clienteCreadoMarker])}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <EditCitaForm cita={citaEditData(cita)} />
              <ConvertirCitaForm cita={cita} processed={processed} />
              <DeleteCitaForm citaId={cita.id} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({ pendientes }: { pendientes: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-neutral-950">
        {pendientes ? "No hay citas pendientes o futuras" : "Todavia no hay citas"}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {pendientes
          ? "Las citas pendientes y confirmadas futuras apareceran aqui."
          : "Añade una cita manual o conecta el webhook de Amelia."}
      </p>
    </div>
  );
}

type CitasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CitasPage({ searchParams }: CitasPageProps) {
  await connection();

  const params = await searchParams;
  const pendientes = isCitasPendientesFilter(params.filtro ?? params.pendientes);
  const citas = await getCitas({ pendientes });

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
              {pendientes ? "Citas pendientes" : "Citas"}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {pendientes
                ? `${citas.length} citas pendientes o futuras ordenadas por fecha y hora`
                : `${citas.length} citas ordenadas por fecha y hora`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={pendientes ? "/citas" : "/citas?filtro=pendientes"}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              {pendientes ? "Ver todas" : "Citas pendientes"}
            </Link>
            <Link
              href="/clientes"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver clientes
            </Link>
          </div>
        </header>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nueva cita manual
            </h2>
          </div>
          <CitaForm />
        </section>

        <section className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Citas manuales y entradas recibidas desde Amelia.
            </p>
          </div>
          {citas.length > 0 ? (
            <>
              <CitasTable citas={citas} />
              <CitasCards citas={citas} />
            </>
          ) : (
            <EmptyState pendientes={pendientes} />
          )}
        </section>
      </div>
    </main>
  );
}
