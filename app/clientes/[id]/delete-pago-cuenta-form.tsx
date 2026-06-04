"use client";

const confirmationMessage = "¿Seguro que deseas eliminar este pago a cuenta?";

export function DeletePagoCuentaForm({
  action,
  clienteId,
  pagoId,
}: {
  action: (formData: FormData) => Promise<void>;
  clienteId: number;
  pagoId: number;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="pagoId" value={pagoId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar
      </button>
    </form>
  );
}
