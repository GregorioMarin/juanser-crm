import type { Material } from "@/app/generated/prisma/client";
import {
  categoriasMaterial,
  unidadesMaterial,
} from "@/app/materiales/constants";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  emptyLabel,
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
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MaterialForm({
  action,
  material,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => Promise<void>;
  material?: Material | null;
  submitLabel: string;
  defaults?: {
    nombre?: string;
    categoria?: string;
    unidadBase?: string;
    returnToGastoId?: string;
    returnToLineaId?: string;
  };
}) {
  const categoria = material?.categoria ?? defaults?.categoria ?? "Otros";
  const unidadBase = material?.unidadBase ?? defaults?.unidadBase ?? "";

  return (
    <form action={action} className="grid gap-4">
      {material ? <input type="hidden" name="materialId" value={material.id} /> : null}
      {defaults?.returnToGastoId ? (
        <input type="hidden" name="returnToGastoId" value={defaults.returnToGastoId} />
      ) : null}
      {defaults?.returnToLineaId ? (
        <input type="hidden" name="returnToLineaId" value={defaults.returnToLineaId} />
      ) : null}

      {material ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Código interno
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {material.codigo}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nombre"
          name="nombre"
          defaultValue={material?.nombre ?? defaults?.nombre}
          required
        />
        <SelectField
          label="Categoría"
          name="categoria"
          options={categoriasMaterial}
          defaultValue={categoria}
        />
        <SelectField
          label="Unidad base"
          name="unidadBase"
          options={unidadesMaterial}
          defaultValue={unidadBase}
          emptyLabel="Sin unidad"
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Descripción interna</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          name="descripcion"
          defaultValue={material?.descripcion ?? ""}
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
