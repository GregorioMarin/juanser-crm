"use client";

import { useActionState, useEffect, useRef } from "react";

export type MultimediaUploadState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const initialState: MultimediaUploadState = {
  status: "idle",
  message: null,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

export function MultimediaUploadForm({
  clienteId,
  action,
}: {
  clienteId: number;
  action: (
    state: MultimediaUploadState,
    formData: FormData,
  ) => Promise<MultimediaUploadState>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo</span>
          <select className={inputClass} name="tipo" defaultValue="CLIENTE">
            <option value="CLIENTE">Archivo aportado por el cliente</option>
            <option value="JUANSER">Propuesta de Juanser</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Archivo multimedia</span>
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
          placeholder="Ejemplo: hueco actual, video de funcionamiento, render IA"
        />
      </label>

      {state.message ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Subiendo..." : "Subir archivo"}
      </button>
    </form>
  );
}
