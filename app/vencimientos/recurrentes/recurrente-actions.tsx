"use client";

import {
  deleteRecurrente,
  toggleRecurrente,
} from "@/app/vencimientos/actions";

export function RecurrenteActions({
  id,
  activo,
  hasHistory,
}: {
  id: string;
  activo: boolean;
  hasHistory: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={toggleRecurrente}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="activo" value={String(!activo)} />
        <button className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          {activo ? "Desactivar" : "Activar"}
        </button>
      </form>
      <form
        action={deleteRecurrente}
        onSubmit={(event) => {
          const message = hasHistory
            ? "Esta recurrencia tiene historial y se desactivará, sin borrar vencimientos. ¿Continuar?"
            : "¿Eliminar definitivamente esta recurrencia?";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button className="inline-flex h-9 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
          {hasHistory ? "Desactivar" : "Borrar"}
        </button>
      </form>
    </div>
  );
}
