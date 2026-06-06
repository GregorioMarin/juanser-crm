"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updatePresupuestoCostes,
  type PresupuestoCostesState,
} from "@/app/presupuestos/actions";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-sm font-medium text-neutral-700";

type MaterialOption = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidadBase: string | null;
  ultimoPrecioCoste: string;
};

type CosteMaterialForm = {
  key: string;
  materialId: string;
  descripcion: string;
  cantidad: string;
  precioCoste: string;
};

type OtroCosteForm = {
  key: string;
  descripcion: string;
  importe: string;
};

type CostesInitialData = {
  presupuestoId: number;
  presupuestoCliente: string;
  costeHorasEstimadas: string;
  costeHora: string;
  costeTransporte: string;
  costeMontaje: string;
  materiales: CosteMaterialForm[];
  otrosCostes: OtroCosteForm[];
};

const initialState: PresupuestoCostesState = {
  status: "idle",
  message: null,
};

function newKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function emptyMaterial(): CosteMaterialForm {
  return {
    key: newKey("material"),
    materialId: "",
    descripcion: "",
    cantidad: "1",
    precioCoste: "0.00",
  };
}

function emptyOtroCoste(): OtroCosteForm {
  return {
    key: newKey("otro"),
    descripcion: "",
    importe: "0.00",
  };
}

function parseAmount(value: string) {
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function marginClass(margen: number) {
  if (margen > 40) {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }

  if (margen >= 20) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-rose-200 bg-rose-50 text-rose-950";
}

export function CostesRentabilidadForm({
  initialData,
  materiales,
}: {
  initialData: CostesInitialData;
  materiales: MaterialOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updatePresupuestoCostes,
    initialState,
  );
  const [costeMateriales, setCosteMateriales] = useState<CosteMaterialForm[]>(
    initialData.materiales.length > 0 ? initialData.materiales : [],
  );
  const [otrosCostes, setOtrosCostes] = useState<OtroCosteForm[]>(
    initialData.otrosCostes.length > 0 ? initialData.otrosCostes : [],
  );
  const [costeHorasEstimadas, setCosteHorasEstimadas] = useState(
    initialData.costeHorasEstimadas,
  );
  const [costeHora, setCosteHora] = useState(initialData.costeHora);
  const [costeTransporte, setCosteTransporte] = useState(
    initialData.costeTransporte,
  );
  const [costeMontaje, setCosteMontaje] = useState(initialData.costeMontaje);

  const resumen = useMemo(() => {
    const presupuestoCliente = parseAmount(initialData.presupuestoCliente);
    const materialesTotal = costeMateriales.reduce(
      (sum, linea) => sum + parseAmount(linea.cantidad) * parseAmount(linea.precioCoste),
      0,
    );
    const manoObraTotal =
      parseAmount(costeHorasEstimadas) * parseAmount(costeHora);
    const transporte = parseAmount(costeTransporte);
    const montaje = parseAmount(costeMontaje);
    const otrosTotal = otrosCostes.reduce(
      (sum, linea) => sum + parseAmount(linea.importe),
      0,
    );
    const costeTotal =
      materialesTotal + manoObraTotal + transporte + montaje + otrosTotal;
    const beneficio = presupuestoCliente - costeTotal;
    const margen =
      presupuestoCliente > 0 ? (beneficio / presupuestoCliente) * 100 : 0;

    return {
      presupuestoCliente,
      materialesTotal,
      manoObraTotal,
      transporte,
      montaje,
      otrosTotal,
      costeTotal,
      beneficio,
      margen,
    };
  }, [
    costeHora,
    costeHorasEstimadas,
    costeMateriales,
    costeMontaje,
    costeTransporte,
    initialData.presupuestoCliente,
    otrosCostes,
  ]);

  function updateMaterial(
    key: string,
    field: keyof Omit<CosteMaterialForm, "key">,
    value: string,
  ) {
    setCosteMateriales((current) =>
      current.map((linea) =>
        linea.key === key ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  function selectMaterial(key: string, materialId: string) {
    const material = materiales.find((item) => item.id === materialId);
    setCosteMateriales((current) =>
      current.map((linea) =>
        linea.key === key
          ? {
              ...linea,
              materialId,
              descripcion: material?.nombre ?? linea.descripcion,
              precioCoste: material?.ultimoPrecioCoste ?? linea.precioCoste,
            }
          : linea,
      ),
    );
  }

  function updateOtroCoste(
    key: string,
    field: keyof Omit<OtroCosteForm, "key">,
    value: string,
  ) {
    setOtrosCostes((current) =>
      current.map((linea) =>
        linea.key === key ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="presupuestoId" value={initialData.presupuestoId} />

      <section className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-950">
              Costes de materiales
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              El precio coste se rellena con la última compra registrada y queda editable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCosteMateriales((current) => [...current, emptyMaterial()])}
            className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Añadir material
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-neutral-200">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-3 py-2">Material interno</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Precio coste</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {costeMateriales.length > 0 ? (
                costeMateriales.map((linea) => (
                  <tr key={linea.key}>
                    <td className="px-3 py-2">
                      <input type="hidden" name="costeMaterialIndex" value={linea.key} />
                      <select
                        className={inputClass}
                        name={`costeMaterial-${linea.key}-materialId`}
                        value={linea.materialId}
                        onChange={(event) => selectMaterial(linea.key, event.target.value)}
                      >
                        <option value="">Sin material</option>
                        {materiales.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.codigo} · {material.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputClass}
                        name={`costeMaterial-${linea.key}-descripcion`}
                        value={linea.descripcion}
                        onChange={(event) =>
                          updateMaterial(linea.key, "descripcion", event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} text-right`}
                        name={`costeMaterial-${linea.key}-cantidad`}
                        inputMode="decimal"
                        value={linea.cantidad}
                        onChange={(event) =>
                          updateMaterial(linea.key, "cantidad", event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} text-right`}
                        name={`costeMaterial-${linea.key}-precioCoste`}
                        inputMode="decimal"
                        value={linea.precioCoste}
                        onChange={(event) =>
                          updateMaterial(linea.key, "precioCoste", event.target.value)
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-neutral-950">
                      {formatCurrency(
                        parseAmount(linea.cantidad) * parseAmount(linea.precioCoste),
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setCosteMateriales((current) =>
                            current.filter((item) => item.key !== linea.key),
                          )
                        }
                        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    Añade materiales para estimar el coste de fabricación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm font-semibold text-neutral-950">
          Coste total materiales: {formatCurrency(resumen.materialesTotal)}
        </p>
      </section>

      <section className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Horas estimadas</span>
          <input
            className={inputClass}
            name="costeHorasEstimadas"
            inputMode="decimal"
            value={costeHorasEstimadas}
            onChange={(event) => setCosteHorasEstimadas(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Coste hora</span>
          <input
            className={inputClass}
            name="costeHora"
            inputMode="decimal"
            value={costeHora}
            onChange={(event) => setCosteHora(event.target.value)}
          />
        </label>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Coste mano de obra
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {formatCurrency(resumen.manoObraTotal)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Ejemplo
          </p>
          <p className="mt-2 text-sm font-medium text-neutral-700">
            20 h x 18 €/h = 360 €
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Coste transporte</span>
          <input
            className={inputClass}
            name="costeTransporte"
            inputMode="decimal"
            value={costeTransporte}
            onChange={(event) => setCosteTransporte(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Coste montaje</span>
          <input
            className={inputClass}
            name="costeMontaje"
            inputMode="decimal"
            value={costeMontaje}
            onChange={(event) => setCosteMontaje(event.target.value)}
          />
        </label>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-lg font-semibold text-neutral-950">Otros costes</h3>
          <button
            type="button"
            onClick={() => setOtrosCostes((current) => [...current, emptyOtroCoste()])}
            className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Añadir coste
          </button>
        </div>

        <div className="grid gap-2">
          {otrosCostes.map((linea) => (
            <div
              key={linea.key}
              className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 md:grid-cols-[1fr_180px_auto]"
            >
              <input type="hidden" name="otroCosteIndex" value={linea.key} />
              <input
                className={inputClass}
                name={`otroCoste-${linea.key}-descripcion`}
                value={linea.descripcion}
                onChange={(event) =>
                  updateOtroCoste(linea.key, "descripcion", event.target.value)
                }
                placeholder="Descripción"
              />
              <input
                className={inputClass}
                name={`otroCoste-${linea.key}-importe`}
                inputMode="decimal"
                value={linea.importe}
                onChange={(event) =>
                  updateOtroCoste(linea.key, "importe", event.target.value)
                }
                placeholder="Importe"
              />
              <button
                type="button"
                onClick={() =>
                  setOtrosCostes((current) =>
                    current.filter((item) => item.key !== linea.key),
                  )
                }
                className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Eliminar
              </button>
            </div>
          ))}
          {otrosCostes.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-5 text-sm text-neutral-500">
              No hay otros costes añadidos.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`grid gap-3 rounded-md border p-4 ${marginClass(resumen.margen)}`}>
        <h3 className="text-lg font-semibold">Resumen económico</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>Presupuesto cliente: <strong>{formatCurrency(resumen.presupuestoCliente)}</strong></p>
          <p>Coste materiales: <strong>{formatCurrency(resumen.materialesTotal)}</strong></p>
          <p>Coste mano de obra: <strong>{formatCurrency(resumen.manoObraTotal)}</strong></p>
          <p>Coste transporte: <strong>{formatCurrency(resumen.transporte)}</strong></p>
          <p>Coste montaje: <strong>{formatCurrency(resumen.montaje)}</strong></p>
          <p>Otros costes: <strong>{formatCurrency(resumen.otrosTotal)}</strong></p>
          <p>Coste total: <strong>{formatCurrency(resumen.costeTotal)}</strong></p>
          <p>Beneficio bruto: <strong>{formatCurrency(resumen.beneficio)}</strong></p>
          <p>Margen %: <strong>{resumen.margen.toFixed(1)}%</strong></p>
        </div>
      </section>

      {state.message ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Guardando..." : "Guardar costes"}
      </button>
    </form>
  );
}
