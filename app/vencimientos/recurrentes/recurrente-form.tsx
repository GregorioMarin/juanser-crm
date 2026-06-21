"use client";

import { useActionState, useState } from "react";
import type { FrecuenciaVencimiento } from "@/app/generated/prisma/client";
import type { VencimientoActionState } from "@/app/vencimientos/actions";
import {
  categoriasVencimiento,
  frecuenciaLabels,
  frecuenciasVencimiento,
  meses,
} from "@/app/vencimientos/constants";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-semibold text-neutral-700";

export type RecurrenteFormValues = {
  id?: string;
  titulo?: string;
  descripcion?: string;
  categoria?: string;
  proveedor?: string;
  titularGastoId?: number | null;
  importeEstimado?: string;
  frecuencia?: FrecuenciaVencimiento;
  intervalo?: number;
  diaMes?: number | null;
  mesAplicable?: number | null;
  fechaInicio?: string;
  fechaFin?: string;
  activo?: boolean;
};

type Titular = { id: number; nombre: string; codigoInterno: string };

export function RecurrenteForm({
  action,
  values = {},
  titulares,
  submitLabel,
}: {
  action: (state: VencimientoActionState, formData: FormData) => Promise<VencimientoActionState>;
  values?: RecurrenteFormValues;
  titulares: Titular[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const [frecuencia, setFrecuencia] = useState<FrecuenciaVencimiento>(
    values.frecuencia ?? "MENSUAL",
  );

  return (
    <form action={formAction} className="grid gap-5">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={labelClass}>Título *</span>
          <input className={inputClass} name="titulo" defaultValue={values.titulo} required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Categoría *</span>
          <select className={inputClass} name="categoria" defaultValue={values.categoria ?? "Otros"} required>
            {categoriasVencimiento.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Proveedor</span>
          <input className={inputClass} name="proveedor" defaultValue={values.proveedor} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Titular del gasto</span>
          <select className={inputClass} name="titularGastoId" defaultValue={values.titularGastoId?.toString() ?? ""}>
            <option value="">Sin titular</option>
            {titulares.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre} · {item.codigoInterno}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Importe estimado *</span>
          <input className={inputClass} name="importeEstimado" inputMode="decimal" defaultValue={values.importeEstimado ?? "0,00"} required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Frecuencia *</span>
          <select
            className={inputClass}
            name="frecuencia"
            value={frecuencia}
            onChange={(event) => setFrecuencia(event.target.value as FrecuenciaVencimiento)}
          >
            {frecuenciasVencimiento.map((item) => (
              <option key={item} value={item}>{frecuenciaLabels[item]}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Intervalo *</span>
          <input className={inputClass} type="number" name="intervalo" min="1" max="100" defaultValue={values.intervalo ?? 1} required />
          <span className="text-xs text-neutral-500">Cada cuántas unidades de la frecuencia se repite.</span>
        </label>
        {frecuencia !== "SEMANAL" ? (
          <label className="grid gap-1.5">
            <span className={labelClass}>Día del mes</span>
            <input className={inputClass} type="number" name="diaMes" min="1" max="31" defaultValue={values.diaMes ?? ""} placeholder="Día de la fecha inicial" />
            <span className="text-xs text-neutral-500">El día 31 se ajusta al último día real del mes.</span>
          </label>
        ) : null}
        {frecuencia === "ANUAL" ? (
          <label className="grid gap-1.5">
            <span className={labelClass}>Mes aplicable</span>
            <select className={inputClass} name="mesAplicable" defaultValue={values.mesAplicable?.toString() ?? ""}>
              <option value="">Mes de la fecha inicial</option>
              {meses.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1.5">
          <span className={labelClass}>Fecha de inicio *</span>
          <input className={inputClass} type="date" name="fechaInicio" defaultValue={values.fechaInicio} required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Fecha de fin</span>
          <input className={inputClass} type="date" name="fechaFin" defaultValue={values.fechaFin} />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className={labelClass}>Descripción</span>
        <textarea className={`${inputClass} min-h-28 resize-y`} name="descripcion" defaultValue={values.descripcion} />
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-neutral-800">
        <input type="checkbox" name="activo" defaultChecked={values.activo ?? true} className="h-4 w-4 accent-emerald-700" />
        Activo y generando vencimientos
      </label>
      {state.message ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{state.message}</p>
      ) : null}
      <button disabled={pending} className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-400">
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
