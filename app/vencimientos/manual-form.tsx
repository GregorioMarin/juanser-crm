"use client";

import { useActionState } from "react";
import type { VencimientoActionState } from "@/app/vencimientos/actions";
import { createVencimientoManual } from "@/app/vencimientos/actions";
import { categoriasVencimiento } from "@/app/vencimientos/constants";

const inputClass = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export function ManualForm({ titulares }: { titulares: { id: number; nombre: string; codigoInterno: string }[] }) {
  const [state, action, pending] = useActionState<VencimientoActionState, FormData>(createVencimientoManual, { message: "" });
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Título *<input className={inputClass} name="titulo" required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Categoría *<select className={inputClass} name="categoria" defaultValue="Otros">{categoriasVencimiento.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Proveedor<input className={inputClass} name="proveedor" /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Titular del gasto<select className={inputClass} name="titularGastoId" defaultValue=""><option value="">Sin titular</option>{titulares.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.codigoInterno}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Importe *<input className={inputClass} name="importe" inputMode="decimal" defaultValue="0,00" required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Fecha de vencimiento *<input className={inputClass} name="fechaVencimiento" type="date" required /></label>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold text-neutral-700">Descripción<textarea className={`${inputClass} min-h-28 resize-y`} name="descripcion" /></label>
      {state.message ? <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{state.message}</p> : null}
      <button disabled={pending} className="inline-flex h-10 w-fit items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-400">{pending ? "Guardando…" : "Crear vencimiento"}</button>
    </form>
  );
}
