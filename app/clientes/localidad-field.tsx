"use client";

import { useEffect, useRef, useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

export function LocalidadField({
  localidades,
  defaultValue,
}: {
  localidades: readonly string[];
  defaultValue?: string | null;
}) {
  const isKnownLocalidad = Boolean(
    defaultValue && localidades.includes(defaultValue),
  );
  const initialValue = isKnownLocalidad ? defaultValue ?? "" : "Otro";
  const selectRef = useRef<HTMLSelectElement>(null);
  const [selected, setSelected] = useState(initialValue);

  useEffect(() => {
    console.log("[LocalidadField] Valor leído al cargar el cliente", defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const select = selectRef.current;
    const form = select?.form;
    if (!form) {
      return;
    }

    const logSelectedLocalidad = () => {
      console.log(
        "[LocalidadField] Valor seleccionado antes del submit",
        select.value,
      );
    };

    form.addEventListener("submit", logSelectedLocalidad);
    return () => form.removeEventListener("submit", logSelectedLocalidad);
  }, []);

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Localidad</span>
        <select
          ref={selectRef}
          className={inputClass}
          name="localidadSeleccionada"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
          }}
        >
          {localidades.map((localidad) => (
            <option key={localidad} value={localidad}>
              {localidad}
            </option>
          ))}
        </select>
      </label>

      {selected === "Otro" ? (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Indica la localidad</span>
          <input
            className={inputClass}
            name="localidadOtro"
            defaultValue={isKnownLocalidad ? "" : defaultValue ?? ""}
            required
          />
        </label>
      ) : null}
    </>
  );
}
