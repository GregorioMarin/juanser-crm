"use client";

import { deleteGasto } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este gasto? También se borrará el archivo asociado si no se usa en otro registro.";

export function DeleteGastoForm({
  gastoId,
  label = "Eliminar",
}: {
  gastoId: string;
  label?: string;
}) {
  return (
    <form
      action={deleteGasto}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="gastoId" value={gastoId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        {label}
      </button>
    </form>
  );
}
