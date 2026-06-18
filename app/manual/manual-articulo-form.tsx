import type { ManualArticulo } from "@/app/generated/prisma/client";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-medium text-neutral-700";
const niveles = ["BASICO", "AVANZADO", "TALLER"] as const;

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
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

function TextareaField({
  label,
  name,
  defaultValue,
  required,
  minHeight = "min-h-28",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  minHeight?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <textarea
        className={`${inputClass} ${minHeight} resize-y`}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </label>
  );
}

export function ManualArticuloForm({
  action,
  articulo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  articulo?: ManualArticulo | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4">
      {articulo ? <input type="hidden" name="id" value={articulo.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Titulo"
          name="titulo"
          defaultValue={articulo?.titulo}
          required
        />
        <Field
          label="Categoria"
          name="categoria"
          defaultValue={articulo?.categoria}
          required
        />
        <Field
          label="Etiquetas"
          name="etiquetas"
          defaultValue={articulo?.etiquetas}
        />
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nivel</span>
          <select
            className={inputClass}
            name="nivel"
            defaultValue={articulo?.nivel ?? "BASICO"}
          >
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Orden"
          name="orden"
          defaultValue={articulo?.orden ?? 0}
        />
        <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-neutral-800">
          <input
            name="activo"
            type="checkbox"
            defaultChecked={articulo?.activo ?? true}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Activo
        </label>
      </div>

      <TextareaField
        label="Resumen"
        name="resumen"
        defaultValue={articulo?.resumen}
      />
      <TextareaField
        label="Contenido"
        name="contenido"
        defaultValue={articulo?.contenido}
        minHeight="min-h-64"
        required
      />
      <TextareaField
        label="Uso comercial"
        name="usoComercial"
        defaultValue={articulo?.usoComercial}
      />
      <TextareaField
        label="Nota interna"
        name="notaInterna"
        defaultValue={articulo?.notaInterna}
      />

      <button
        type="submit"
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
