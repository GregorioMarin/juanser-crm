"use client";

import { useActionState, useRef, useState } from "react";
import type { Gasto, GastoLinea } from "@/app/generated/prisma/client";
import {
  categoriasGasto,
  emptyGastoAnalizado,
  formasPagoGasto,
  GastoAnalizado,
  GastoLineaAnalizada,
  tiposDocumentoGasto,
} from "@/app/gastos/constants";
import { type GastoFormState } from "@/app/gastos/actions";

const initialGastoFormState: GastoFormState = {
  status: "idle",
  message: null,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

type FormLinea = {
  key: string;
  id?: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  piezas: string;
  medida: string;
  precioUnidadMedida: string;
  importe: string;
};

function isSerreriaAlmeriense(proveedor: string) {
  return proveedor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("serreria almeriense");
}

function dateValue(date?: Date | string | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

function moneyValue(value?: { toString(): string } | string | null) {
  return value?.toString() ?? "";
}

function textValue(value?: string | null) {
  return value ?? "";
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  emptyLabel = "Sin especificar",
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
  emptyLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type GastoEditable = Pick<
  Gasto,
  | "id"
  | "proveedor"
  | "fecha"
  | "tipoDocumento"
  | "numeroDocumento"
  | "categoria"
  | "baseImponible"
  | "iva"
  | "total"
  | "formaPago"
  | "descripcion"
  | "observaciones"
  | "archivoUrl"
  | "clienteId"
> & {
  lineas?: GastoLinea[];
};

function valuesFromGasto(gasto?: GastoEditable | null): GastoAnalizado {
  if (!gasto) {
    return emptyGastoAnalizado;
  }

  return {
    proveedor: gasto.proveedor ?? "",
    fecha: dateValue(gasto.fecha),
    tipoDocumento: gasto.tipoDocumento ?? "",
    numeroDocumento: gasto.numeroDocumento ?? "",
    categoria: gasto.categoria ?? "",
    baseImponible: moneyValue(gasto.baseImponible),
    iva: moneyValue(gasto.iva),
    total: moneyValue(gasto.total),
    formaPago: gasto.formaPago ?? "",
    descripcion: gasto.descripcion ?? "",
    observaciones: gasto.observaciones ?? "",
    lineas:
      gasto.lineas?.map((linea) => ({
        id: linea.id,
        descripcion: linea.descripcion,
        cantidad: moneyValue(linea.cantidad) || null,
        precioUnitario: moneyValue(linea.precioUnitario) || null,
        piezas: moneyValue(linea.piezas) || null,
        medida: moneyValue(linea.medida) || null,
        precioUnidadMedida: moneyValue(linea.precioUnidadMedida) || null,
        importe: moneyValue(linea.importe) || null,
      })) ?? [],
  };
}

function initialLineas(data?: GastoAnalizado, gasto?: GastoEditable | null) {
  const source = data?.lineas ?? valuesFromGasto(gasto).lineas;

  return source.map((linea, index): FormLinea => ({
    key: linea.id ?? `linea-${index}-${Date.now()}`,
    id: linea.id,
    descripcion: linea.descripcion,
    cantidad: textValue(linea.cantidad),
    precioUnitario: textValue(linea.precioUnitario),
    piezas: textValue(linea.piezas),
    medida: textValue(linea.medida),
    precioUnidadMedida: textValue(linea.precioUnidadMedida),
    importe: textValue(linea.importe),
  }));
}

function DecimalInput({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className={inputClass}
      name={name}
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function LineasTable({
  initial,
  serreriaFormat,
}: {
  initial: FormLinea[];
  serreriaFormat: boolean;
}) {
  const [lineas, setLineas] = useState<FormLinea[]>(initial);

  function updateLinea(index: number, field: keyof GastoLineaAnalizada, value: string) {
    setLineas((current) =>
      current.map((linea, currentIndex) =>
        currentIndex === index ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  return (
    <section className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            Artículos del documento
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Cada producto o material debe ir en una línea independiente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLineas((current) => [
              ...current,
              {
                key: `nueva-${Date.now()}-${current.length}`,
                descripcion: "",
                cantidad: "",
                precioUnitario: "",
                piezas: "",
                medida: "",
                precioUnidadMedida: "",
                importe: "",
              },
            ]);
          }}
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          Añadir línea
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-2 py-2">Descripción</th>
              {serreriaFormat ? (
                <>
                  <th className="px-2 py-2">Piezas</th>
                  <th className="px-2 py-2">Medida</th>
                  <th className="px-2 py-2">Precio/medida</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2">Cantidad</th>
                  <th className="px-2 py-2">Precio unitario</th>
                </>
              )}
              <th className="px-2 py-2">Importe</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => (
              <tr key={linea.key}>
                <td className="px-2 py-2">
                  <input type="hidden" name="lineaIndex" value={linea.key} />
                  {linea.id ? (
                    <input
                      type="hidden"
                      name={`linea-${linea.key}-id`}
                      value={linea.id}
                    />
                  ) : null}
                  <input
                    className={inputClass}
                    name={`linea-${linea.key}-descripcion`}
                    value={linea.descripcion}
                    onChange={(event) =>
                      updateLinea(index, "descripcion", event.target.value)
                    }
                    placeholder="Producto o material"
                  />
                </td>
                {serreriaFormat ? (
                  <>
                    <td className="px-2 py-2">
                      <DecimalInput
                        name={`linea-${linea.key}-piezas`}
                        value={linea.piezas}
                        onChange={(value) => updateLinea(index, "piezas", value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <DecimalInput
                        name={`linea-${linea.key}-medida`}
                        value={linea.medida}
                        onChange={(value) => updateLinea(index, "medida", value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <DecimalInput
                        name={`linea-${linea.key}-precioUnidadMedida`}
                        value={linea.precioUnidadMedida}
                        onChange={(value) =>
                          updateLinea(index, "precioUnidadMedida", value)
                        }
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2">
                      <DecimalInput
                        name={`linea-${linea.key}-cantidad`}
                        value={linea.cantidad}
                        onChange={(value) => updateLinea(index, "cantidad", value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <DecimalInput
                        name={`linea-${linea.key}-precioUnitario`}
                        value={linea.precioUnitario}
                        onChange={(value) =>
                          updateLinea(index, "precioUnitario", value)
                        }
                      />
                    </td>
                  </>
                )}
                <td className="px-2 py-2">
                  <DecimalInput
                    name={`linea-${linea.key}-importe`}
                    value={linea.importe}
                    onChange={(value) => updateLinea(index, "importe", value)}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setLineas((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lineas.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-5 text-sm text-neutral-500">
          No hay líneas todavía. Añade una manualmente o guarda solo la cabecera.
        </p>
      ) : null}
    </section>
  );
}

export function GastoForm({
  action,
  submitLabel,
  data,
  archivoUrl,
  gasto,
}: {
  action: (
    state: GastoFormState,
    formData: FormData,
  ) => Promise<GastoFormState>;
  submitLabel: string;
  data?: GastoAnalizado;
  archivoUrl?: string | null;
  gasto?: GastoEditable | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialGastoFormState);
  const allowIncompleteRef = useRef<HTMLInputElement>(null);
  const values = data ?? valuesFromGasto(gasto);
  const [proveedor, setProveedor] = useState(values.proveedor);
  const fileUrl = archivoUrl ?? gasto?.archivoUrl ?? "";
  const lineas = initialLineas(data, gasto);
  const serreriaFormat = isSerreriaAlmeriense(proveedor);

  return (
    <form
      action={formAction}
      className="grid gap-5"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const formData = new FormData(form);
        const proveedorValue = formData.get("proveedor");
        const total = formData.get("total");
        const isIncomplete =
          typeof proveedorValue !== "string" ||
          proveedorValue.trim() === "" ||
          typeof total !== "string" ||
          total.trim() === "";

        if (allowIncompleteRef.current) {
          allowIncompleteRef.current.checked = false;
        }

        if (
          isIncomplete &&
          !window.confirm(
            "El gasto no tiene proveedor o total. ¿Quieres guardarlo incompleto?",
          )
        ) {
          event.preventDefault();
          return;
        }

        if (isIncomplete && allowIncompleteRef.current) {
          allowIncompleteRef.current.checked = true;
        }
      }}
    >
      {gasto ? <input type="hidden" name="gastoId" value={gasto.id} /> : null}
      <input type="hidden" name="archivoUrl" value={fileUrl} />
      <input ref={allowIncompleteRef} type="checkbox" name="allowIncomplete" hidden />

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-neutral-950">
          Datos generales
        </h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Proveedor</span>
            <input
              className={inputClass}
              name="proveedor"
              value={proveedor}
              onChange={(event) => setProveedor(event.target.value)}
            />
          </label>
          <Field label="Fecha" name="fecha" type="date" defaultValue={values.fecha} />
          <SelectField
            label="Tipo de documento"
            name="tipoDocumento"
            options={tiposDocumentoGasto}
            defaultValue={values.tipoDocumento}
          />
          <Field
            label="Número"
            name="numeroDocumento"
            defaultValue={values.numeroDocumento}
          />
          <SelectField
            label="Categoría"
            name="categoria"
            options={categoriasGasto}
            defaultValue={values.categoria || "Otros"}
          />
          <SelectField
            label="Forma de pago"
            name="formaPago"
            options={formasPagoGasto}
            defaultValue={values.formaPago}
          />
          <Field
            label="Base imponible"
            name="baseImponible"
            type="number"
            defaultValue={values.baseImponible}
            placeholder="0.00"
          />
          <Field label="IVA" name="iva" type="number" defaultValue={values.iva} />
          <Field label="Total" name="total" type="number" defaultValue={values.total} />
          <Field
            label="Cliente vinculado"
            name="clienteId"
            type="number"
            defaultValue={gasto?.clienteId?.toString() ?? ""}
            placeholder="ID de cliente"
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Descripción</span>
          <input
            className={inputClass}
            name="descripcion"
            defaultValue={values.descripcion}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observaciones</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            name="observaciones"
            defaultValue={values.observaciones}
          />
        </label>
      </section>

      <LineasTable initial={lineas} serreriaFormat={serreriaFormat} />

      {state.message ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
