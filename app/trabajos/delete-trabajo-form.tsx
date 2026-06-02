"use client";

import { deleteTrabajo } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este trabajo terminado? Esta acción no se puede deshacer.";

export function DeleteTrabajoForm({ trabajoId }: { trabajoId: number }) {
  return (
    <form
      action={deleteTrabajo}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar trabajo
      </button>
    </form>
  );
}
