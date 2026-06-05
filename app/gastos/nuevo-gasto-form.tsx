"use client";

import { useActionState, useMemo, useState } from "react";
import {
  analizarDocumentoGasto,
  createGasto,
  type AnalizarGastoState,
} from "./actions";
import { GastoForm } from "./gasto-form";
import { emptyGastoAnalizado } from "./constants";

const initialAnalizarGastoState: AnalizarGastoState = {
  status: "idle",
  message: null,
  archivoUrl: null,
  fileName: null,
  mimeType: null,
  data: emptyGastoAnalizado,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export function NuevoGastoForm() {
  const [state, formAction, pending] = useActionState(
    analizarDocumentoGasto,
    initialAnalizarGastoState,
  );
  const [preview, setPreview] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);

  const savedIsImage = state.mimeType?.startsWith("image/");
  const previewNode = useMemo(() => {
    if (state.archivoUrl) {
      if (savedIsImage) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.archivoUrl}
            alt={state.fileName ?? "Documento de gasto"}
            className="max-h-[520px] w-full rounded-md border border-neutral-200 object-contain"
          />
        );
      }

      return (
        <iframe
          title={state.fileName ?? "Documento de gasto"}
          src={state.archivoUrl}
          className="h-[520px] w-full rounded-md border border-neutral-200 bg-white"
        />
      );
    }

    if (!preview) {
      return (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          Selecciona un archivo para ver la vista previa.
        </p>
      );
    }

    if (preview.type.startsWith("image/")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.url}
          alt={preview.name}
          className="max-h-[520px] w-full rounded-md border border-neutral-200 object-contain"
        />
      );
    }

    return (
      <iframe
        title={preview.name}
        src={preview.url}
        className="h-[520px] w-full rounded-md border border-neutral-200 bg-white"
      />
    );
  }, [preview, savedIsImage, state.archivoUrl, state.fileName]);

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-950">
          Documento original
        </h2>
        <form action={formAction} encType="multipart/form-data" className="mt-4 grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">
              Imagen o PDF
            </span>
            <input
              className={inputClass}
              name="archivo"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (preview) {
                  URL.revokeObjectURL(preview.url);
                }
                setPreview(
                  file
                    ? {
                        url: URL.createObjectURL(file),
                        type: file.type,
                        name: file.name,
                      }
                    : null,
                );
              }}
            />
          </label>

          {state.message ? (
            <p
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                state.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {pending ? "Analizando..." : "Analizar documento con IA"}
          </button>
        </form>

        <div className="mt-5">{previewNode}</div>
      </section>

      {state.archivoUrl ? (
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-950">
              Revisión manual
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Corrige cualquier dato antes de guardar. Nada se registra hasta confirmar.
            </p>
          </div>
          <GastoForm
            action={createGasto}
            submitLabel="Guardar gasto"
            data={state.data}
            archivoUrl={state.archivoUrl}
          />
        </section>
      ) : null}
    </div>
  );
}
