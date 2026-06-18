"use client";

import { deleteManualArticulo } from "./actions";

export function DeleteManualArticuloForm({
  id,
  label = "Eliminar",
}: {
  id: number;
  label?: string;
}) {
  return (
    <form
      action={deleteManualArticulo}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar este articulo del manual?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        {label}
      </button>
    </form>
  );
}
