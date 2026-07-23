"use client";

import { useMemo, useState } from "react";
import { updatePresupuesto } from "./actions";

const estados = ["PENDIENTE", "ACEPTADO", "RECHAZADO", "INSTALADO"] as const;
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-medium text-neutral-700";

type PresupuestoLineaForm = {
  key: string;
  concepto: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
};

type PresupuestoFormData = {
  id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  fecha: string;
  validezDias: number;
  observaciones: string;
  ivaPorcentaje: string;
  lineas: PresupuestoLineaForm[];
};

function emptyLinea(): PresupuestoLineaForm {
  return {
    key: crypto.randomUUID(),
    concepto: "",
    descripcion: "",
    cantidad: "1",
    precioUnitario: "0",
  };
}

function parseAmount(value: string) {
  const numberValue = Number(value.replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
  }).format(value);
}

export function EditPresupuestoForm({
  presupuesto,
  returnTo,
}: {
  presupuesto: PresupuestoFormData;
  returnTo: string;
}) {
  const [lineas, setLineas] = useState<PresupuestoLineaForm[]>(
    presupuesto.lineas.length > 0 ? presupuesto.lineas : [emptyLinea()],
  );
  const [ivaPorcentaje, setIvaPorcentaje] = useState(presupuesto.ivaPorcentaje);
  const iva = parseAmount(ivaPorcentaje);
  const totals = useMemo(() => {
    const totalSinIva = lineas.reduce(
      (sum, linea) =>
        sum + parseAmount(linea.cantidad) * parseAmount(linea.precioUnitario),
      0,
    );
    const totalIva = (totalSinIva * iva) / 100;

    return {
      totalSinIva,
      totalIva,
      totalConIva: totalSinIva + totalIva,
    };
  }, [iva, lineas]);

  function updateLinea(
    key: string,
    field: keyof Omit<PresupuestoLineaForm, "key">,
    value: string,
  ) {
    setLineas((current) =>
      current.map((linea) =>
        linea.key === key ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  function deleteLinea(key: string) {
    setLineas((current) => {
      if (current.length === 1) {
        return [emptyLinea()];
      }

      return current.filter((linea) => linea.key !== key);
    });
  }

  return (
    <form
      action={updatePresupuesto}
      className="grid gap-5 rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="presupuestoId" value={presupuesto.id} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Titulo</span>
          <input
            className={inputClass}
            name="titulo"
            defaultValue={presupuesto.titulo}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Estado</span>
          <select className={inputClass} name="estado" defaultValue={presupuesto.estado}>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fecha</span>
          <input
            className={inputClass}
            name="fecha"
            type="date"
            defaultValue={presupuesto.fecha}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Validez (dias)</span>
          <input
            className={inputClass}
            name="validezDias"
            type="number"
            min="0"
            defaultValue={presupuesto.validezDias}
          />
        </label>
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
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripcion</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          name="descripcion"
          defaultValue={presupuesto.descripcion}
          required
        />
      </label>

      <div className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={labelClass}>Lineas</p>
        </div>

        {lineas.map((linea, index) => (
          <div
            key={linea.key}
            className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 lg:grid-cols-[1fr_1.4fr_120px_160px_130px_auto]"
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
              placeholder="Descripcion"
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
              {formatCurrency(
                parseAmount(linea.cantidad) * parseAmount(linea.precioUnitario),
              )}
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
        ))}
        <button
          type="button"
          onClick={() => setLineas((current) => [...current, emptyLinea()])}
          className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          ➕ Añadir línea
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Observaciones</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="observaciones"
          defaultValue={presupuesto.observaciones}
        />
      </label>

      <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold text-neutral-500">Base: </span>
          <span className="font-semibold text-neutral-950">
            {formatCurrency(totals.totalSinIva)}
          </span>
        </p>
        <p>
          <span className="font-semibold text-neutral-500">IVA: </span>
          <span className="font-semibold text-neutral-950">
            {formatCurrency(totals.totalIva)}
          </span>
        </p>
        <p>
          <span className="font-semibold text-neutral-500">Total: </span>
          <span className="font-semibold text-neutral-950">
            {formatCurrency(totals.totalConIva)}
          </span>
        </p>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Guardar presupuesto
      </button>
    </form>
  );
}
