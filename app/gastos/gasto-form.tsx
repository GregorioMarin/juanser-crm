"use client";

import { useActionState, useRef } from "react";
import type { Gasto } from "@/app/generated/prisma/client";
import {
  categoriasGasto,
  emptyGastoAnalizado,
  formasPagoGasto,
  GastoAnalizado,
  tiposDocumentoGasto,
} from "@/app/gastos/constants";
import {
  type GastoFormState,
} from "@/app/gastos/actions";

const initialGastoFormState: GastoFormState = {
  status: "idle",
  message: null,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

function dateValue(date?: Date | string | null) {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
}

function moneyValue(value?: { toString(): string } | string | null) {
  return value?.toString() ?? "";
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
>;

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
  };
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
  const fileUrl = archivoUrl ?? gasto?.archivoUrl ?? "";

  return (
    <form
      action={formAction}
      className="grid gap-4"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const proveedor = new FormData(form).get("proveedor");
        const total = new FormData(form).get("total");
        const isIncomplete =
          typeof proveedor !== "string" ||
          proveedor.trim() === "" ||
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Proveedor" name="proveedor" defaultValue={values.proveedor} />
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
