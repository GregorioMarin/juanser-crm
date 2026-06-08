"use client";

import { deleteFacturaVenta } from "@/app/facturas-venta/actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar esta factura de venta? También se borrará el PDF asociado.";

export function DeleteFacturaVentaForm({
  facturaId,
  returnTo,
  label = "Eliminar",
}: {
  facturaId: number;
  returnTo: string;
  label?: string;
}) {
  return (
    <form
      action={deleteFacturaVenta}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="facturaId" value={facturaId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        {label}
      </button>
    </form>
  );
}
