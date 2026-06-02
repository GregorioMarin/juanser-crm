"use client";

import { deleteProveedor } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este proveedor? Esta acción no se puede deshacer.";

export function DeleteProveedorForm({ proveedorId }: { proveedorId: number }) {
  return (
    <form
      action={deleteProveedor}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="proveedorId" value={proveedorId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar proveedor
      </button>
    </form>
  );
}
