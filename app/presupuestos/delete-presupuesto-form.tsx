"use client";

import { deletePresupuesto } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este presupuesto? Esta acción no se puede deshacer.";

export function DeletePresupuestoForm({
  presupuestoId,
  returnTo,
}: {
  presupuestoId: number;
  returnTo: string;
}) {
  return (
    <form
      action={deletePresupuesto}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="presupuestoId" value={presupuestoId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar presupuesto
      </button>
    </form>
  );
}
