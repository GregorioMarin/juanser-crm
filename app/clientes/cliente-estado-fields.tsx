"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

export function ClienteEstadoFields({
  estados,
  motivosRechazo,
  defaultEstado,
  defaultMotivoRechazo,
}: {
  estados: readonly string[];
  motivosRechazo: readonly string[];
  defaultEstado: string;
  defaultMotivoRechazo?: string | null;
}) {
  const [estado, setEstado] = useState(defaultEstado);

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Estado</span>
        <select
          className={inputClass}
          name="estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        >
          {estados.map((estadoOption) => (
            <option key={estadoOption} value={estadoOption}>
              {estadoOption}
            </option>
          ))}
        </select>
      </label>

      {estado === "Perdido" ? (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Motivo de rechazo</span>
          <select
            className={inputClass}
            name="motivoRechazo"
            defaultValue={defaultMotivoRechazo ?? motivosRechazo[0]}
          >
            {motivosRechazo.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}
