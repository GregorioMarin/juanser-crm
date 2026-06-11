"use client";

import { useActionState, useState } from "react";
import { updateCita, type CitaActionState } from "./actions";
import { citaEstados, type CitaEstadoNormalizado } from "./helpers";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

const initialState: CitaActionState = {
  ok: false,
  message: "",
};

type EditCitaFormProps = {
  cita: {
    id: number;
    clienteNombre: string;
    telefono: string | null;
    email: string | null;
    fechaHora: string;
    estado: CitaEstadoNormalizado;
    servicio: string | null;
    nota: string | null;
  };
};

function EditField({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

export function EditCitaForm({ cita }: EditCitaFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateCita, initialState);

  return (
    <>
      <button
        type="button"
        aria-label={`Editar cita de ${cita.clienteNombre}`}
        title="Editar cita"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
      >
        <span aria-hidden="true" className="text-base leading-none">
          ✎
        </span>
        <span>Editar cita</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`editar-cita-${cita.id}`}
        >
          <div className="w-full max-w-2xl rounded-md border border-neutral-300 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2
                  id={`editar-cita-${cita.id}`}
                  className="text-lg font-semibold text-neutral-950"
                >
                  Editar cita
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {cita.clienteNombre}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-xl leading-none text-neutral-700 transition hover:bg-neutral-100"
              >
                ×
              </button>
            </div>

            <form action={formAction} className="mt-5 grid gap-4">
              <input type="hidden" name="citaId" value={cita.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <EditField
                  label="Nombre"
                  name="clienteNombre"
                  defaultValue={cita.clienteNombre}
                  required
                />
                <EditField
                  label="Telefono"
                  name="telefono"
                  type="tel"
                  defaultValue={cita.telefono ?? ""}
                />
                <EditField
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={cita.email ?? ""}
                />
                <EditField
                  label="Fecha y hora"
                  name="fechaHora"
                  type="datetime-local"
                  defaultValue={cita.fechaHora}
                  required
                />
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Estado</span>
                  <select
                    className={inputClass}
                    name="estado"
                    defaultValue={cita.estado}
                  >
                    {citaEstados.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </label>
                <EditField
                  label="Servicio"
                  name="servicio"
                  defaultValue={cita.servicio ?? ""}
                />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Nota</span>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  name="nota"
                  defaultValue={cita.nota ?? ""}
                />
              </label>

              {state.message ? (
                <p
                  aria-live="polite"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    state.ok
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {state.message}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
                >
                  {pending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
