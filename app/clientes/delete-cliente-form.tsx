"use client";

import { deleteCliente } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este cliente?\nTambién se eliminarán seguimientos, actividad, presupuestos, fotos, vídeos y archivos asociados.";

export function DeleteClienteForm({
  clienteId,
  label = "Eliminar",
  className,
}: {
  clienteId: number;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={deleteCliente}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <button
        type="submit"
        className={
          className ??
          "inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        }
      >
        {label}
      </button>
    </form>
  );
}
