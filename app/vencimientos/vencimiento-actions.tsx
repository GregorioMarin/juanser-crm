"use client";

import {
  deleteVencimientoManual,
  updateEstadoVencimiento,
} from "@/app/vencimientos/actions";

export function VencimientoActions({
  id,
  estado,
  manual,
}: {
  id: string;
  estado: "PENDIENTE" | "PAGADO" | "CANCELADO";
  manual: boolean;
}) {
  if (estado !== "PENDIENTE") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <form action={updateEstadoVencimiento}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="estado" value="PAGADO" />
        <button className="inline-flex h-8 items-center rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800">Marcar pagado</button>
      </form>
      <form action={updateEstadoVencimiento}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="estado" value="CANCELADO" />
        <button className="inline-flex h-8 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Cancelar</button>
      </form>
      {manual ? (
        <form
          action={deleteVencimientoManual}
          onSubmit={(event) => {
            if (!window.confirm("¿Eliminar este vencimiento manual pendiente?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button className="inline-flex h-8 items-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50">Borrar</button>
        </form>
      ) : null}
    </div>
  );
}
