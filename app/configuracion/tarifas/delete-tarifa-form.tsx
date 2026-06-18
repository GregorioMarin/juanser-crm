"use client";

import { deleteTarifaInterna } from "./actions";

export function DeleteTarifaForm({ id }: { id: number }) {
  return (
    <form
      action={deleteTarifaInterna}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar esta tarifa interna?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar
      </button>
    </form>
  );
}
