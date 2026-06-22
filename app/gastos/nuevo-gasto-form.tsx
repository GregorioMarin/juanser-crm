"use client";

import { useActionState, useState } from "react";
import type { Material, TitularGasto } from "@/app/generated/prisma/client";
import { analizarDocumentoGasto, createGasto, type AnalizarGastoState } from "./actions";
import { GastoForm } from "./gasto-form";
import { emptyGastoAnalizado } from "./constants";
import { MultiFileInput } from "./multi-file-input";

const initialAnalizarGastoState: AnalizarGastoState = {
  status: "idle",
  message: null,
  archivoUrl: null,
  fileName: null,
  mimeType: null,
  archivos: [],
  data: emptyGastoAnalizado,
};

type MaterialOption = Pick<Material, "id" | "codigo" | "nombre" | "categoria" | "unidadBase">;
type TitularGastoOption = Pick<TitularGasto, "id" | "codigoInterno" | "nombre">;

export function NuevoGastoForm({ materiales, titularesGasto }: { materiales: MaterialOption[]; titularesGasto: TitularGastoOption[] }) {
  const [state, formAction, pending] = useActionState(analizarDocumentoGasto, initialAnalizarGastoState);
  const [mode, setMode] = useState<"documento" | "manual">("documento");

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-md border border-neutral-300 bg-white p-3 shadow-sm sm:grid-cols-2">
        <button type="button" onClick={() => setMode("documento")} className={`h-11 rounded-md px-4 text-sm font-semibold transition ${mode === "documento" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"}`}>Crear con IA</button>
        <button type="button" onClick={() => setMode("manual")} className={`h-11 rounded-md px-4 text-sm font-semibold transition ${mode === "manual" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"}`}>Crear manualmente</button>
      </div>

      {mode === "documento" ? (
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Documento original</h2>
          <p className="mt-1 text-sm text-neutral-500">Selecciona las hojas en el orden en que deben leerse. La IA las tratará como un único albarán o factura.</p>
          <form action={formAction} encType="multipart/form-data" className="mt-4 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-neutral-700">Imágenes o PDF</span>
              <MultiFileInput required />
            </label>
            {state.message ? <p className={`rounded-md border px-4 py-3 text-sm font-semibold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{state.message}</p> : null}
            <button type="submit" disabled={pending} className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400">{pending ? "Analizando..." : "Analizar documento con IA"}</button>
          </form>
          {state.archivos.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {state.archivos.map((archivo, index) => (
                <article key={archivo.url} className="rounded-md border border-neutral-200 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 text-sm"><strong>{index + 1}. {archivo.filename}</strong><a href={archivo.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700">Abrir</a></div>
                  {archivo.mimeType.startsWith("image/") ? <img src={archivo.url} alt={archivo.filename} className="max-h-[520px] w-full object-contain" /> : <iframe title={archivo.filename} src={archivo.url} className="h-[520px] w-full bg-white" />}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "documento" && state.archivos.length > 0 ? (
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="text-xl font-semibold text-neutral-950">Revisión manual</h2><p className="mt-1 text-sm text-neutral-500">Corrige cualquier dato antes de guardar. Nada se registra hasta confirmar.</p></div>
          <GastoForm action={createGasto} submitLabel="Guardar gasto" data={state.data} archivoUrl={state.archivos[0]?.url} archivos={state.archivos} materiales={materiales} titularesGasto={titularesGasto} />
        </section>
      ) : null}

      {mode === "manual" ? (
        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="text-xl font-semibold text-neutral-950">Gasto manual</h2><p className="mt-1 text-sm text-neutral-500">Crea un albarán, factura, ticket u otro gasto sin subir archivo.</p></div>
          <GastoForm action={createGasto} submitLabel="Guardar gasto manual" data={emptyGastoAnalizado} archivoUrl="" archivos={[]} materiales={materiales} titularesGasto={titularesGasto} />
        </section>
      ) : null}
    </div>
  );
}