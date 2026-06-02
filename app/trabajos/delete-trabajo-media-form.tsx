"use client";

import { deleteTrabajoMedia } from "./actions";

const confirmationMessage =
  "¿Seguro que deseas eliminar este archivo? Esta acción no se puede deshacer.";

export function DeleteTrabajoMediaForm({
  trabajoId,
  mediaId,
}: {
  trabajoId: number;
  mediaId: number;
}) {
  return (
    <form
      action={deleteTrabajoMedia}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <input type="hidden" name="mediaId" value={mediaId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Eliminar archivo
      </button>
    </form>
  );
}
