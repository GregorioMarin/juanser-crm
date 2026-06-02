"use client";

import { deleteDocumentoProveedor } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este documento? Esta acción no se puede deshacer.";

export function DeleteDocumentoProveedorForm({
  proveedorId,
  documentoId,
}: {
  proveedorId: number;
  documentoId: number;
}) {
  return (
    <form
      action={deleteDocumentoProveedor}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="proveedorId" value={proveedorId} />
      <input type="hidden" name="documentoId" value={documentoId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar documento
      </button>
    </form>
  );
}
