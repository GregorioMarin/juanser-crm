"use client";

import { useMemo, useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-medium text-neutral-700";

type Linea = {
  key: string;
  concepto: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
};

function emptyLinea(): Linea {
  return {
    key: crypto.randomUUID(),
    concepto: "",
    descripcion: "",
    cantidad: "1",
    precioUnitario: "0",
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function CreatePresupuestoLines() {
  const [lineas, setLineas] = useState<Linea[]>([emptyLinea()]);
  const [ivaPorcentaje, setIvaPorcentaje] = useState("21");
  const totals = useMemo(() => {
    const base = lineas.reduce(
      (sum, linea) =>
        sum + parseAmount(linea.cantidad) * parseAmount(linea.precioUnitario),
      0,
    );
    const iva = (base * parseAmount(ivaPorcentaje)) / 100;
    return { base, iva, total: base + iva };
  }, [ivaPorcentaje, lineas]);

  function updateLinea(
    key: string,
    field: Exclude<keyof Linea, "key">,
    value: string,
  ) {
    setLineas((current) =>
      current.map((linea) =>
        linea.key === key ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  function deleteLinea(key: string) {
    setLineas((current) =>
      current.length === 1
        ? [emptyLinea()]
        : current.filter((linea) => linea.key !== key),
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>IVA (%)</span>
        <input
          className={inputClass}
          name="ivaPorcentaje"
          type="number"
          step="0.01"
          min="0"
          value={ivaPorcentaje}
          onChange={(event) => setIvaPorcentaje(event.target.value)}
          required
        />
      </label>

      <div className="grid gap-3">
        <p className={labelClass}>Líneas</p>
        {lineas.map((linea, index) => {
          const importe =
            parseAmount(linea.cantidad) * parseAmount(linea.precioUnitario);

          return (
            <div
              key={linea.key}
              className="grid gap-3 rounded-md border border-neutral-200 bg-white p-3 lg:grid-cols-[1fr_1.4fr_120px_160px_130px_auto]"
            >
              <input
                className={inputClass}
                name={`lineas[${index}][concepto]`}
                value={linea.concepto}
                onChange={(event) =>
                  updateLinea(linea.key, "concepto", event.target.value)
                }
                placeholder="Concepto"
                required
              />
              <input
                className={inputClass}
                name={`lineas[${index}][descripcion]`}
                value={linea.descripcion}
                onChange={(event) =>
                  updateLinea(linea.key, "descripcion", event.target.value)
                }
                placeholder="Descripción"
              />
              <input
                className={inputClass}
                name={`lineas[${index}][cantidad]`}
                type="number"
                step="0.01"
                min="0"
                value={linea.cantidad}
                onChange={(event) =>
                  updateLinea(linea.key, "cantidad", event.target.value)
                }
                placeholder="Cantidad"
                required
              />
              <input
                className={inputClass}
                name={`lineas[${index}][precioUnitario]`}
                type="number"
                step="0.01"
                min="0"
                value={linea.precioUnitario}
                onChange={(event) =>
                  updateLinea(linea.key, "precioUnitario", event.target.value)
                }
                placeholder="Precio unitario"
                required
              />
              <output className="flex h-10 items-center justify-end whitespace-nowrap px-2 text-sm font-semibold text-neutral-950">
                {formatCurrency(importe)}
              </output>
              <button
                type="button"
                onClick={() => deleteLinea(linea.key)}
                aria-label={`Eliminar línea ${index + 1}`}
                title="Eliminar línea"
                className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 px-3 text-lg text-rose-700 transition hover:bg-rose-50"
              >
                🗑️
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setLineas((current) => [...current, emptyLinea()])}
          className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          ➕ Añadir línea
        </button>
      </div>

      <div className="grid gap-2 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold text-neutral-500">Base imponible: </span>
          <span className="font-semibold">{formatCurrency(totals.base)}</span>
        </p>
        <p>
          <span className="font-semibold text-neutral-500">IVA: </span>
          <span className="font-semibold">{formatCurrency(totals.iva)}</span>
        </p>
        <p>
          <span className="font-semibold text-neutral-500">Total: </span>
          <span className="font-semibold">{formatCurrency(totals.total)}</span>
        </p>
      </div>
    </>
  );
}
