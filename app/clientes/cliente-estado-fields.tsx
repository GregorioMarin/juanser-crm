"use client";

import { useState } from "react";
import {
  estadoComercialLabel,
  estadoProduccionForComercial,
  estadoProduccionLabel,
  estadoProduccionNoAplica,
  estadosProduccionReales,
} from "@/app/clientes/estados";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

export function ClienteEstadoFields({
  estadosComerciales,
  estadosProduccion,
  motivosRechazo,
  defaultEstadoComercial,
  defaultEstadoProduccion,
  defaultMotivoRechazo,
}: {
  estadosComerciales: readonly string[];
  estadosProduccion: readonly string[];
  motivosRechazo: readonly string[];
  defaultEstadoComercial: string;
  defaultEstadoProduccion: string;
  defaultMotivoRechazo?: string | null;
}) {
  const [estadoComercial, setEstadoComercial] = useState(defaultEstadoComercial);
  const [estadoProduccion, setEstadoProduccion] = useState(
    estadoProduccionForComercial(defaultEstadoComercial, defaultEstadoProduccion),
  );
  const isPerdido = estadoComercial === "PERDIDO";
  const canUseProduccion = estadoComercial === "ACEPTADO";

  function handleEstadoComercialChange(nextEstado: string) {
    setEstadoComercial(nextEstado);
    setEstadoProduccion((current) =>
      estadoProduccionForComercial(nextEstado, current),
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Estado comercial</span>
        <select
          className={inputClass}
          name="estadoComercial"
          value={estadoComercial}
          onChange={(event) => handleEstadoComercialChange(event.target.value)}
        >
          {estadosComerciales.map((estadoOption) => (
            <option key={estadoOption} value={estadoOption}>
              {estadoComercialLabel(estadoOption)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Estado producción</span>
        {!canUseProduccion ? (
          <input
            type="hidden"
            name="estadoProduccion"
            value={estadoProduccionNoAplica}
          />
        ) : null}
        <select
          className={inputClass}
          name="estadoProduccion"
          value={canUseProduccion ? estadoProduccion : estadoProduccionNoAplica}
          onChange={(event) => setEstadoProduccion(event.target.value)}
          disabled={!canUseProduccion}
        >
          {canUseProduccion ? (
            estadosProduccionReales.map((estadoOption) => (
              <option key={estadoOption} value={estadoOption}>
                {estadoProduccionLabel(estadoOption)}
              </option>
            ))
          ) : (
            <option value={estadoProduccionNoAplica}>
              {estadoProduccionLabel(estadoProduccionNoAplica)}
            </option>
          )}
        </select>
      </label>

      <label className={isPerdido ? "flex flex-col gap-1.5" : "hidden"}>
        <span className={labelClass}>Motivo de rechazo</span>
        <select
          className={inputClass}
          name="motivoRechazo"
          defaultValue={defaultMotivoRechazo ?? motivosRechazo[0]}
          required={isPerdido}
        >
          {motivosRechazo.map((motivo) => (
            <option key={motivo} value={motivo}>
              {motivo}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
