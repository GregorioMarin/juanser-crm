import type { FacturaVenta } from "@/app/generated/prisma/client";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-medium text-neutral-700";
const estadosCobro = ["PENDIENTE", "PARCIAL", "COBRADA"] as const;

type ClienteOption = {
  id: number;
  nombre: string;
  presupuestos: {
    id: number;
    numero: string;
    titulo: string;
  }[];
};

type PresupuestoOption = {
  id: number;
  numero: string;
  titulo: string;
};

type FacturaEditable = Pick<
  FacturaVenta,
  | "id"
  | "clienteId"
  | "presupuestoId"
  | "numeroFactura"
  | "fechaFactura"
  | "baseImponible"
  | "iva"
  | "total"
  | "estadoCobro"
  | "notas"
>;

function dateValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function moneyValue(value?: { toString(): string } | null) {
  return value?.toString() ?? "";
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

export function FacturaVentaForm({
  action,
  clientes,
  cliente,
  presupuestos,
  factura,
  returnTo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  clientes?: ClienteOption[];
  cliente?: { id: number; nombre: string };
  presupuestos?: PresupuestoOption[];
  factura?: FacturaEditable | null;
  returnTo: string;
  submitLabel: string;
}) {
  const selectedClienteId = factura?.clienteId ?? cliente?.id ?? clientes?.[0]?.id;
  const presupuestoOptions =
    presupuestos ??
    clientes?.find((item) => item.id === selectedClienteId)?.presupuestos ??
    [];
  const selectedPresupuestoId =
    factura?.presupuestoId ?? (presupuestoOptions.length === 1 ? presupuestoOptions[0].id : "");

  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      {factura ? <input type="hidden" name="facturaId" value={factura.id} /> : null}
      <input type="hidden" name="returnTo" value={returnTo} />
      {cliente ? (
        <input type="hidden" name="clienteId" value={cliente.id} />
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cliente</span>
          <select
            className={inputClass}
            name="clienteId"
            defaultValue={selectedClienteId}
            required
          >
            {clientes?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Nº factura"
          name="numeroFactura"
          defaultValue={factura?.numeroFactura ?? ""}
        />
        <Field
          label="Fecha"
          name="fechaFactura"
          type="date"
          defaultValue={dateValue(factura?.fechaFactura)}
        />
        <Field
          label="Base imponible"
          name="baseImponible"
          type="number"
          defaultValue={moneyValue(factura?.baseImponible)}
        />
        <Field
          label="IVA"
          name="iva"
          type="number"
          defaultValue={moneyValue(factura?.iva)}
        />
        <Field
          label="Total"
          name="total"
          type="number"
          defaultValue={moneyValue(factura?.total)}
        />
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Estado cobro</span>
          <select
            className={inputClass}
            name="estadoCobro"
            defaultValue={factura?.estadoCobro ?? "PENDIENTE"}
          >
            {estadosCobro.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 xl:col-span-2">
          <span className={labelClass}>Presupuesto vinculado</span>
          <select
            className={inputClass}
            name="presupuestoId"
            defaultValue={selectedPresupuestoId}
          >
            <option value="">Sin vincular</option>
            {presupuestoOptions.map((presupuesto) => (
              <option key={presupuesto.id} value={presupuesto.id}>
                {presupuesto.numero} · {presupuesto.titulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Notas</span>
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          name="notas"
          defaultValue={factura?.notas ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          PDF{factura ? " nuevo (opcional)" : ""}
        </span>
        <input
          className={inputClass}
          name="archivo"
          type="file"
          accept="application/pdf,.pdf"
          required={!factura}
        />
      </label>

      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
