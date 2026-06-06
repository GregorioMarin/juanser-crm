"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Material } from "@/app/generated/prisma/client";
import {
  asignarMaterialGastoLinea,
  crearYAsignarMaterialGastoLinea,
  type MaterialLineaState,
} from "@/app/gastos/actions";
import {
  categoriasMaterial,
  prefijoCategoriaMaterial,
  unidadesMaterial,
} from "@/app/materiales/constants";

type MaterialOption = Pick<
  Material,
  "id" | "codigo" | "nombre" | "categoria" | "unidadBase"
>;

type MaterialLineaActionProps = {
  gastoId: string;
  lineaId: string;
  descripcion: string;
  currentMaterialId?: string | null;
  materiales: MaterialOption[];
};

const initialState: MaterialLineaState = {
  status: "idle",
  message: null,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function MaterialLineaAction({
  gastoId,
  lineaId,
  descripcion,
  currentMaterialId,
  materiales,
}: MaterialLineaActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codigoQuery, setCodigoQuery] = useState("");
  const [nombreQuery, setNombreQuery] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState(currentMaterialId ?? "");
  const [categoria, setCategoria] =
    useState<(typeof categoriasMaterial)[number]>("Otros");
  const [assignState, setAssignState] = useState(initialState);
  const [createState, setCreateState] = useState(initialState);
  const [assignPending, startAssignTransition] = useTransition();
  const [createPending, startCreateTransition] = useTransition();

  const filteredMateriales = useMemo(() => {
    const codigo = normalize(codigoQuery);
    const nombre = normalize(nombreQuery);

    return materiales.filter((material) => {
      const matchesCodigo = codigo
        ? normalize(material.codigo).includes(codigo)
        : true;
      const matchesNombre = nombre
        ? normalize(material.nombre).includes(nombre)
        : true;

      return matchesCodigo && matchesNombre;
    });
  }, [codigoQuery, materiales, nombreQuery]);

  function openDialog() {
    setSelectedMaterialId(currentMaterialId ?? "");
    setAssignState(initialState);
    setCreateState(initialState);
    setOpen(true);
  }

  function handleAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startAssignTransition(async () => {
      const result = await asignarMaterialGastoLinea(initialState, formData);
      setAssignState(result);
      if (result.status === "success") {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startCreateTransition(async () => {
      const result = await crearYAsignarMaterialGastoLinea(initialState, formData);
      setCreateState(result);
      if (result.status === "success") {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
      >
        {currentMaterialId ? "Editar línea" : "Asignar material"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/45 px-4 py-8">
          <div className="w-full max-w-3xl rounded-md border border-neutral-300 bg-white p-5 shadow-xl">
            <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  Material de la línea
                </h3>
                <p className="mt-1 text-sm text-neutral-600">{descripcion}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-5">
              <section className="grid gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <div>
                  <h4 className="text-base font-semibold text-neutral-950">
                    Asignar material existente
                  </h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Buscar por código interno</span>
                    <input
                      className={inputClass}
                      value={codigoQuery}
                      onChange={(event) => setCodigoQuery(event.target.value)}
                      placeholder="TAB-000001"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Buscar por nombre</span>
                    <input
                      className={inputClass}
                      value={nombreQuery}
                      onChange={(event) => setNombreQuery(event.target.value)}
                      placeholder="Tablero Hickory..."
                    />
                  </label>
                </div>

                <form onSubmit={handleAssignSubmit} className="grid gap-3">
                  <input type="hidden" name="gastoId" value={gastoId} />
                  <input type="hidden" name="lineaId" value={lineaId} />
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Material</span>
                    <select
                      className={inputClass}
                      name="materialId"
                      value={selectedMaterialId}
                      onChange={(event) => setSelectedMaterialId(event.target.value)}
                    >
                      <option value="">Selecciona un material</option>
                      {filteredMateriales.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.codigo} · {material.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  {filteredMateriales.length === 0 ? (
                    <p className="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
                      No hay materiales que coincidan con la búsqueda.
                    </p>
                  ) : null}
                  {assignState.status === "error" && assignState.message ? (
                    <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                      {assignState.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={assignPending || !selectedMaterialId}
                    className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {assignPending ? "Guardando..." : "Asignar material"}
                  </button>
                </form>
              </section>

              <section className="grid gap-4 rounded-md border border-neutral-200 p-4">
                <div>
                  <h4 className="text-base font-semibold text-neutral-950">
                    Crear material nuevo
                  </h4>
                  <p className="mt-1 text-sm text-neutral-500">
                    Código automático previsto: {prefijoCategoriaMaterial(categoria)}-000001 o el siguiente disponible.
                  </p>
                </div>

                <form onSubmit={handleCreateSubmit} className="grid gap-4">
                  <input type="hidden" name="gastoId" value={gastoId} />
                  <input type="hidden" name="lineaId" value={lineaId} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Nombre</span>
                      <input
                        className={inputClass}
                        name="nombre"
                        defaultValue={descripcion}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Categoría</span>
                      <select
                        className={inputClass}
                        name="categoria"
                        value={categoria}
                        onChange={(event) =>
                          setCategoria(
                            event.target.value as (typeof categoriasMaterial)[number],
                          )
                        }
                      >
                        {categoriasMaterial.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Unidad base</span>
                      <select className={inputClass} name="unidadBase" defaultValue="">
                        <option value="">Sin unidad</option>
                        {unidadesMaterial.map((unidad) => (
                          <option key={unidad} value={unidad}>
                            {unidad}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Descripción interna</span>
                    <textarea
                      className={`${inputClass} min-h-24 resize-y`}
                      name="descripcion"
                    />
                  </label>
                  {createState.status === "error" && createState.message ? (
                    <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                      {createState.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={createPending}
                    className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {createPending ? "Creando..." : "Crear y asignar"}
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
