"use client";

import { deleteCita } from "./actions";

const confirmationMessage = "¿Seguro que deseas eliminar esta cita?";

export function DeleteCitaForm({ citaId }: { citaId: number }) {
  return (
    <form
      action={deleteCita}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="citaId" value={citaId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar cita
      </button>
    </form>
  );
}
