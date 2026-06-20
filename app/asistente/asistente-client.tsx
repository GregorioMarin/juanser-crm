"use client";

import { useRef, useState, useTransition } from "react";
import {
  crearCitaDesdeAsistente,
  crearContactoDesdeAsistente,
  crearPresupuestoDesdeAsistente,
  crearSeguimientoDesdeAsistente,
} from "./actions";
import type { AnalisisSolicitudIA, AsistenteActionResult } from "./types";

const maxFileSize = 10 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-neutral-500";

type StringKey =
  | "nombre"
  | "telefono"
  | "email"
  | "direccion"
  | "localidad"
  | "codigoPostal"
  | "provincia"
  | "tipoTrabajo"
  | "medidas"
  | "materiales"
  | "urgencia"
  | "fechaHora"
  | "resumenInterno"
  | "respuestaWhatsapp";

type BooleanKey =
  | "solicitaCita"
  | "preguntaPrecio"
  | "aceptaPresupuesto"
  | "rechazaPresupuesto"
  | "necesitaSeguimiento"
  | "enviaraFotos"
  | "enviaraPlanos";

const flags: { key: BooleanKey; label: string }[] = [
  { key: "solicitaCita", label: "Solicita cita" },
  { key: "preguntaPrecio", label: "Pregunta precio" },
  { key: "aceptaPresupuesto", label: "Acepta presupuesto" },
  { key: "rechazaPresupuesto", label: "Rechaza presupuesto" },
  { key: "necesitaSeguimiento", label: "Necesita seguimiento" },
  { key: "enviaraFotos", label: "Enviará fotos" },
  { key: "enviaraPlanos", label: "Enviará planos" },
];

function Field({
  label,
  field,
  analysis,
  onChange,
}: {
  label: string;
  field: StringKey;
  analysis: AnalisisSolicitudIA;
  onChange: (field: StringKey, value: string) => void;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        value={analysis[field] ?? ""}
        onChange={(event) => onChange(field, event.target.value)}
      />
    </label>
  );
}

export function AsistenteClient() {
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalisisSolicitudIA | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AsistenteActionResult | null>(null);
  const [clienteId, setClienteId] = useState<number>();
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectFile(file: File | null) {
    setError(null);
    if (!file) {
      setArchivo(null);
      return;
    }
    if (!acceptedTypes.includes(file.type)) {
      setError("Solo se aceptan archivos PDF, JPG, PNG o WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      setError("El archivo no puede superar 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setArchivo(file);
  }

  async function analyze() {
    setError(null);
    setNotice(null);
    if (!texto.trim() && !archivo) {
      setError("Pega un mensaje o selecciona un archivo para analizar.");
      return;
    }
    setAnalyzing(true);
    try {
      const body = new FormData();
      body.set("texto", texto);
      if (archivo) body.set("archivo", archivo);
      const response = await fetch("/api/asistente/analizar", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as AnalisisSolicitudIA & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo analizar la solicitud.");
      setAnalysis(payload);
      setClienteId(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo analizar la solicitud.");
    } finally {
      setAnalyzing(false);
    }
  }

  function update(field: StringKey, value: string) {
    setAnalysis((current) => (current ? { ...current, [field]: value } : current));
    if (field === "telefono") setClienteId(undefined);
  }

  function runAction(
    action: (payload: {
      analisis: AnalisisSolicitudIA;
      textoOriginal: string;
      clienteId?: number;
    }) => Promise<AsistenteActionResult>,
    navigate = false,
  ) {
    if (!analysis) return;
    setNotice(null);
    startTransition(async () => {
      const result = await action({ analisis: analysis, textoOriginal: texto, clienteId });
      setNotice(result);
      if (result.clienteId) setClienteId(result.clienteId);
      if (result.ok && navigate && result.href) window.location.assign(result.href);
    });
  }

  async function copyWhatsapp() {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis.respuestaWhatsapp);
      setNotice({ ok: true, message: "Respuesta de WhatsApp copiada." });
    } catch {
      setNotice({ ok: false, message: "No se pudo copiar. Selecciona el texto manualmente." });
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-lg text-white">✦</span>
          <div>
            <h2 className="font-semibold">Nueva solicitud</h2>
            <p className="text-xs text-neutral-500">Texto, captura, foto o PDF</p>
          </div>
        </div>
        <textarea
          className="mt-5 min-h-72 w-full resize-y rounded-2xl border border-neutral-300 bg-stone-50 p-4 text-sm leading-6 text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          value={texto}
          maxLength={50_000}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Pega aquí el email, mensaje de WhatsApp o cualquier conversación del cliente..."
        />
        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <label className="block cursor-pointer">
            <span className="block text-sm font-semibold text-neutral-800">Subir archivo</span>
            <span className="mt-1 block text-xs text-neutral-500">JPG, PNG, WEBP o PDF · máximo 10 MB</span>
            <input
              ref={fileInputRef}
              className="mt-3 block w-full text-xs text-neutral-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:font-semibold file:text-white"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {archivo ? <p className="mt-2 truncate text-xs font-medium text-emerald-700">✓ {archivo.name}</p> : null}
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p> : null}
        <button
          type="button"
          disabled={analyzing}
          onClick={analyze}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          {analyzing ? "Analizando solicitud…" : "Analizar solicitud"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-neutral-500">La IA puede equivocarse. Todos los campos se pueden editar antes de guardar.</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Resultado</p>
            <h2 className="mt-1 text-xl font-semibold">Resultado del análisis</h2>
          </div>
          {analysis ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Editable</span> : null}
        </div>

        {!analysis ? (
          <div className="flex min-h-[34rem] flex-col items-center justify-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-3xl">🤖</span>
            <h3 className="mt-5 text-lg font-semibold">Preparado para ayudarte</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">El análisis organizado aparecerá aquí, listo para corregir y convertir en acciones del CRM.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" field="nombre" analysis={analysis} onChange={update} />
              <Field label="Teléfono" field="telefono" analysis={analysis} onChange={update} />
              <Field label="Email" field="email" analysis={analysis} onChange={update} />
              <Field label="Localidad" field="localidad" analysis={analysis} onChange={update} />
              <div className="sm:col-span-2"><Field label="Dirección" field="direccion" analysis={analysis} onChange={update} /></div>
              <Field label="Código postal" field="codigoPostal" analysis={analysis} onChange={update} />
              <Field label="Provincia" field="provincia" analysis={analysis} onChange={update} />
              <Field label="Tipo de trabajo" field="tipoTrabajo" analysis={analysis} onChange={update} />
              <Field label="Urgencia" field="urgencia" analysis={analysis} onChange={update} />
              <div className="sm:col-span-2"><Field label="Medidas detectadas" field="medidas" analysis={analysis} onChange={update} /></div>
              <div className="sm:col-span-2"><Field label="Materiales y colores" field="materiales" analysis={analysis} onChange={update} /></div>
              <div className="sm:col-span-2"><Field label="Fecha y hora detectadas (ISO)" field="fechaHora" analysis={analysis} onChange={update} /></div>
            </div>

            <div>
              <span className={labelClass}>Señales comerciales</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {flags.map((flag) => (
                  <label key={flag.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={analysis[flag.key]}
                      onChange={(event) => setAnalysis({ ...analysis, [flag.key]: event.target.checked })}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    {flag.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>Resumen interno</span>
              <textarea className={`${inputClass} min-h-28 resize-y leading-6`} value={analysis.resumenInterno} onChange={(event) => update("resumenInterno", event.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Datos que faltan</span>
              <textarea
                className={`${inputClass} min-h-24 resize-y leading-6`}
                value={analysis.datosFaltantes.join("\n")}
                onChange={(event) => setAnalysis({ ...analysis, datosFaltantes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })}
                placeholder="Un dato por línea"
              />
            </label>
            <label className="block rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-emerald-800">Respuesta WhatsApp</span>
              <textarea className="min-h-40 w-full resize-y bg-transparent text-sm leading-6 text-neutral-900 outline-none" value={analysis.respuestaWhatsapp} onChange={(event) => update("respuestaWhatsapp", event.target.value)} />
            </label>

            {notice ? (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                {notice.message}{notice.href && !pending ? <> <a className="underline" href={notice.href}>Abrir</a></> : null}
              </div>
            ) : null}

            <div className="grid gap-2 border-t border-neutral-200 pt-5 sm:grid-cols-2 xl:grid-cols-3">
              <button disabled={pending} onClick={() => runAction(crearContactoDesdeAsistente, true)} className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">Crear contacto</button>
              <button disabled={pending} onClick={() => runAction(crearSeguimientoDesdeAsistente)} className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Crear seguimiento</button>
              <button disabled={pending} onClick={() => runAction(crearCitaDesdeAsistente)} className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Crear cita pendiente</button>
              <button disabled={pending} onClick={() => runAction(crearPresupuestoDesdeAsistente, true)} className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Crear presupuesto borrador</button>
              <button disabled={pending} onClick={copyWhatsapp} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:col-span-2 xl:col-span-2">Copiar respuesta WhatsApp</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

