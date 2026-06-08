"use client";

import { useActionState, useMemo, useState } from "react";
import type { Gasto, GastoLinea, Material } from "@/app/generated/prisma/client";
import {
  categoriasGasto,
  emptyGastoAnalizado,
  formasPagoGasto,
  GastoAnalizado,
  tiposDocumentoGasto,
  tiposGasto,
} from "@/app/gastos/constants";
import { type GastoFormState } from "@/app/gastos/actions";
import {
  categoriasMaterial,
  unidadesMaterial,
} from "@/app/materiales/constants";

const initialGastoFormState: GastoFormState = {
  status: "idle",
  message: null,
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

type FormLinea = {
  key: string;
  id?: string;
  materialId: string;
  codigoMaterialDetectado: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  unidadMedidaProveedor: string;
  piezas: string;
  medida: string;
  precioUnidadMedida: string;
  importe: string;
  esPorte: boolean;
  esPendienteServir: boolean;
  pedidoProveedor: string;
  newMaterialOpen: boolean;
  newMaterialNombre: string;
  newMaterialCategoria: string;
  newMaterialUnidadBase: string;
};

type MaterialOption = Pick<
  Material,
  "id" | "codigo" | "nombre" | "categoria" | "unidadBase"
>;

function dateValue(date?: Date | string | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

function moneyValue(value?: { toString(): string } | string | null) {
  return value?.toString() ?? "";
}

function textValue(value?: string | null) {
  return value ?? "";
}

function isSerreriaAlmeriense(proveedor: string | null) {
  return proveedor
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("serreria almeriense") ?? false;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  emptyLabel = "Sin especificar",
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
  emptyLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type GastoEditable = Pick<
  Gasto,
  | "id"
  | "tipoGasto"
  | "proveedor"
  | "fecha"
  | "tipoDocumento"
  | "numeroDocumento"
  | "categoria"
  | "baseImponible"
  | "iva"
  | "total"
  | "formaPago"
  | "descripcion"
  | "observaciones"
  | "archivoUrl"
  | "clienteId"
> & {
  lineas?: GastoLinea[];
};

function valuesFromGasto(gasto?: GastoEditable | null): GastoAnalizado {
  if (!gasto) {
    return emptyGastoAnalizado;
  }

  return {
    tipoGasto: gasto.tipoGasto ?? "Otros",
    proveedorTipo: "GENERICO",
    proveedor: gasto.proveedor ?? "",
    fecha: dateValue(gasto.fecha),
    tipoDocumento: gasto.tipoDocumento ?? "",
    numeroDocumento: gasto.numeroDocumento ?? "",
    categoria: gasto.categoria ?? "",
    baseImponible: moneyValue(gasto.baseImponible),
    iva: moneyValue(gasto.iva),
    total: moneyValue(gasto.total),
    formaPago: gasto.formaPago ?? "",
    descripcion: gasto.descripcion ?? "",
    observaciones: gasto.observaciones ?? "",
    lineas:
      gasto.lineas?.map((linea) => ({
        id: linea.id,
        materialId: linea.materialId,
        codigoMaterialDetectado: linea.codigoMaterialDetectado,
        descripcion: linea.descripcion,
        cantidad: moneyValue(linea.cantidad) || null,
        precioUnitario: moneyValue(linea.precioUnitario) || null,
        unidadMedidaProveedor: linea.unidadMedidaProveedor,
        piezas: moneyValue(linea.piezas) || null,
        medida: moneyValue(linea.medida) || null,
        precioUnidadMedida: moneyValue(linea.precioUnidadMedida) || null,
        importe: moneyValue(linea.importe) || null,
        esPorte: linea.esPorte,
        esPendienteServir: linea.esPendienteServir,
        pedidoProveedor: linea.pedidoProveedor,
      })) ?? [],
  };
}

function initialLineas(data?: GastoAnalizado, gasto?: GastoEditable | null) {
  const source = data?.lineas ?? valuesFromGasto(gasto).lineas;

  return source.map((linea, index): FormLinea => ({
    key: linea.id ?? `linea-${index}-${Date.now()}`,
    id: linea.id,
    materialId: textValue(linea.materialId),
    codigoMaterialDetectado: textValue(linea.codigoMaterialDetectado),
    descripcion: linea.descripcion,
    cantidad: textValue(linea.cantidad),
    precioUnitario: textValue(linea.precioUnitario),
    unidadMedidaProveedor: textValue(linea.unidadMedidaProveedor),
    piezas: textValue(linea.piezas),
    medida: textValue(linea.medida),
    precioUnidadMedida: textValue(linea.precioUnidadMedida),
    importe: textValue(linea.importe),
    esPorte: linea.esPorte,
    esPendienteServir: linea.esPendienteServir,
    pedidoProveedor: textValue(linea.pedidoProveedor),
    newMaterialOpen: false,
    newMaterialNombre: "",
    newMaterialCategoria: "Otros",
    newMaterialUnidadBase: "",
  }));
}

function DecimalInput({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className={inputClass}
      name={name}
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function decimalNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function decimalText(value: number) {
  return value.toFixed(2);
}

function initialImporteLineas(lineas: FormLinea[]) {
  return lineas.reduce((sum, linea) => {
    if (linea.esPendienteServir) {
      return sum;
    }

    const number = decimalNumber(linea.importe);
    return number === null ? sum : sum + number;
  }, 0);
}

function LineasTable({
  initial,
  materiales,
  gastoId,
  showMedida,
  onImportesChange,
}: {
  initial: FormLinea[];
  materiales: MaterialOption[];
  gastoId?: string;
  showMedida: boolean;
  onImportesChange: (total: number) => void;
}) {
  const [lineas, setLineas] = useState<FormLinea[]>(initial);

  function emitImportes(next: FormLinea[]) {
    onImportesChange(
      next.reduce((sum, linea) => {
        if (linea.esPendienteServir) {
          return sum;
        }

        const number = Number(linea.importe.replace(",", "."));
        return Number.isFinite(number) ? sum + number : sum;
      }, 0),
    );
  }

  function updateLineas(updater: (current: FormLinea[]) => FormLinea[]) {
    setLineas((current) => {
      const next = updater(current);
      emitImportes(next);
      return next;
    });
  }

  function updateLinea(index: number, field: keyof FormLinea, value: string | boolean) {
    updateLineas((current) =>
      current.map((linea, currentIndex) =>
        currentIndex === index ? { ...linea, [field]: value } : linea,
      ),
    );
  }

  function updateLineaMaterial(index: number, materialId: string) {
    const material = materiales.find((item) => item.id === materialId);
    updateLineas((current) =>
      current.map((linea, currentIndex) =>
        currentIndex === index
          ? {
              ...linea,
              materialId,
              codigoMaterialDetectado: material?.codigo ?? linea.codigoMaterialDetectado,
            }
          : linea,
      ),
    );
  }

  function materialCreateHref(linea: FormLinea) {
    const params = new URLSearchParams();
    if (gastoId) {
      params.set("gastoId", gastoId);
    }
    if (linea.id) {
      params.set("lineaId", linea.id);
    }
    if (linea.descripcion) {
      params.set("nombre", linea.descripcion);
    }

    return `/materiales/nuevo?${params.toString()}`;
  }

  return (
    <section className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            Artículos del documento
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Cada producto o material debe ir en una línea independiente.
          </p>
        </div>
        <button
          type="button"
        onClick={() => {
            updateLineas((current) => [
              ...current,
              {
                key: `nueva-${Date.now()}-${current.length}`,
                descripcion: "",
                materialId: "",
                codigoMaterialDetectado: "",
                cantidad: "",
                precioUnitario: "",
                unidadMedidaProveedor: "",
                piezas: "",
                medida: "",
                precioUnidadMedida: "",
                importe: "",
                esPorte: false,
                esPendienteServir: false,
                pedidoProveedor: "",
                newMaterialOpen: false,
                newMaterialNombre: "",
                newMaterialCategoria: "Otros",
                newMaterialUnidadBase: "",
              },
            ]);
          }}
          className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          Añadir línea
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] border-collapse text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <tr>
              <th className="px-2 py-2">Código</th>
              <th className="px-2 py-2">Descripción</th>
              <th className="px-2 py-2">Cantidad</th>
              <th className="px-2 py-2">UM</th>
              <th className="px-2 py-2">Piezas</th>
              {showMedida ? <th className="px-2 py-2">Medida</th> : null}
              <th className="px-2 py-2">Precio</th>
              <th className="px-2 py-2">Importe</th>
              <th className="px-2 py-2">Pendiente</th>
              <th className="px-2 py-2">Porte</th>
              <th className="px-2 py-2">Material vinculado</th>
              <th className="px-2 py-2">Pedido</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => (
              <tr key={linea.key}>
                <td className="px-2 py-2">
                  <input type="hidden" name="lineaIndex" value={linea.key} />
                  {linea.id ? (
                    <input
                      type="hidden"
                      name={`linea-${linea.key}-id`}
                      value={linea.id}
                    />
                  ) : null}
                  <input
                    type="hidden"
                    name={`linea-${linea.key}-precioUnitario`}
                    value={linea.precioUnitario}
                  />
                  <input
                    className={inputClass}
                    name={`linea-${linea.key}-codigoMaterialDetectado`}
                    value={linea.codigoMaterialDetectado}
                    onChange={(event) =>
                      updateLinea(index, "codigoMaterialDetectado", event.target.value)
                    }
                    placeholder="TAB, TAB-000001..."
                  />
                </td>
                <td className="min-w-80 px-2 py-2">
                  <input
                    className={inputClass}
                    name={`linea-${linea.key}-descripcion`}
                    value={linea.descripcion}
                    onChange={(event) =>
                      updateLinea(index, "descripcion", event.target.value)
                    }
                    placeholder="Producto o material"
                  />
                </td>
                <td className="px-2 py-2">
                  <DecimalInput
                    name={`linea-${linea.key}-cantidad`}
                    value={linea.cantidad}
                    onChange={(value) => updateLinea(index, "cantidad", value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className={inputClass}
                    name={`linea-${linea.key}-unidadMedidaProveedor`}
                    value={linea.unidadMedidaProveedor}
                    onChange={(event) =>
                      updateLinea(
                        index,
                        "unidadMedidaProveedor",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="CIEN, UNID..."
                  />
                </td>
                <td className="px-2 py-2">
                  <DecimalInput
                    name={`linea-${linea.key}-piezas`}
                    value={linea.piezas}
                    onChange={(value) => updateLinea(index, "piezas", value)}
                  />
                </td>
                {showMedida ? (
                  <td className="px-2 py-2">
                    <DecimalInput
                      name={`linea-${linea.key}-medida`}
                      value={linea.medida}
                      onChange={(value) => updateLinea(index, "medida", value)}
                    />
                  </td>
                ) : (
                  <input
                    type="hidden"
                    name={`linea-${linea.key}-medida`}
                    value={linea.medida}
                  />
                )}
                <td className="px-2 py-2">
                  <DecimalInput
                    name={`linea-${linea.key}-precioUnidadMedida`}
                    value={linea.precioUnidadMedida}
                    onChange={(value) =>
                      updateLinea(index, "precioUnidadMedida", value)
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <DecimalInput
                    name={`linea-${linea.key}-importe`}
                    value={linea.importe}
                    onChange={(value) => updateLinea(index, "importe", value)}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    className="h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-600"
                    type="checkbox"
                    name={`linea-${linea.key}-esPendienteServir`}
                    checked={linea.esPendienteServir}
                    onChange={(event) =>
                      updateLinea(index, "esPendienteServir", event.target.checked)
                    }
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    className="h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-600"
                    type="checkbox"
                    name={`linea-${linea.key}-esPorte`}
                    checked={linea.esPorte}
                    onChange={(event) =>
                      updateLinea(index, "esPorte", event.target.checked)
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="grid gap-2">
                    <select
                      className={inputClass}
                      name={`linea-${linea.key}-materialId`}
                      value={linea.materialId}
                      onChange={(event) =>
                        updateLineaMaterial(index, event.target.value)
                      }
                    >
                      <option value="">Sin vincular</option>
                      {materiales.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.codigo} · {material.nombre}
                        </option>
                      ))}
                    </select>
                    <a
                      href={materialCreateHref(linea)}
                      className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                    >
                      Crear material en otra pantalla
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        updateLinea(index, "newMaterialOpen", !linea.newMaterialOpen)
                      }
                      className="w-fit text-xs font-semibold text-neutral-700 transition hover:text-neutral-950"
                    >
                      {linea.newMaterialOpen ? "Ocultar alta rápida" : "Crear material nuevo"}
                    </button>
                    {linea.newMaterialOpen ? (
                      <div className="grid gap-2 rounded-md border border-neutral-200 bg-white p-2">
                        <input
                          className={inputClass}
                          name={`linea-${linea.key}-newMaterialNombre`}
                          value={linea.newMaterialNombre}
                          onChange={(event) =>
                            updateLinea(index, "newMaterialNombre", event.target.value)
                          }
                          placeholder="Nombre interno"
                        />
                        <select
                          className={inputClass}
                          name={`linea-${linea.key}-newMaterialCategoria`}
                          value={linea.newMaterialCategoria}
                          onChange={(event) =>
                            updateLinea(index, "newMaterialCategoria", event.target.value)
                          }
                        >
                          {categoriasMaterial.map((categoria) => (
                            <option key={categoria} value={categoria}>
                              {categoria}
                            </option>
                          ))}
                        </select>
                        <select
                          className={inputClass}
                          name={`linea-${linea.key}-newMaterialUnidadBase`}
                          value={linea.newMaterialUnidadBase}
                          onChange={(event) =>
                            updateLinea(index, "newMaterialUnidadBase", event.target.value)
                          }
                        >
                          <option value="">Sin unidad</option>
                          {unidadesMaterial.map((unidad) => (
                            <option key={unidad} value={unidad}>
                              {unidad}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <input
                    className={inputClass}
                    name={`linea-${linea.key}-pedidoProveedor`}
                    value={linea.pedidoProveedor}
                    onChange={(event) =>
                      updateLinea(index, "pedidoProveedor", event.target.value)
                    }
                    placeholder="N/PEDIDO"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      updateLineas((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lineas.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-5 text-sm text-neutral-500">
          No hay líneas todavía. Añade una manualmente o guarda solo la cabecera.
        </p>
      ) : null}
    </section>
  );
}

export function GastoForm({
  action,
  submitLabel,
  data,
  archivoUrl,
  gasto,
  materiales = [],
}: {
  action: (
    state: GastoFormState,
    formData: FormData,
  ) => Promise<GastoFormState>;
  submitLabel: string;
  data?: GastoAnalizado;
  archivoUrl?: string | null;
  gasto?: GastoEditable | null;
  materiales?: MaterialOption[];
}) {
  const [state, formAction, pending] = useActionState(action, initialGastoFormState);
  const values = data ?? valuesFromGasto(gasto);
  const [tipoGasto, setTipoGasto] = useState(values.tipoGasto || "Otros");
  const [proveedor, setProveedor] = useState(values.proveedor);
  const [baseImponible, setBaseImponible] = useState(values.baseImponible);
  const [iva, setIva] = useState(values.iva);
  const [total, setTotal] = useState(values.total);
  const [ivaPorcentaje, setIvaPorcentaje] = useState("21");
  const fileUrl = archivoUrl ?? gasto?.archivoUrl ?? "";
  const lineas = useMemo(() => initialLineas(data, gasto), [data, gasto]);
  const [importeLineas, setImporteLineas] = useState(initialImporteLineas(lineas));
  const isMateriales = tipoGasto === "Materiales";
  const showMedidaLineas = isSerreriaAlmeriense(proveedor);

  function calcularTotalDesdeBase() {
    const base = decimalNumber(baseImponible);
    if (base === null) {
      return;
    }

    const ivaManual = decimalNumber(iva);
    const percent = decimalNumber(ivaPorcentaje) ?? 21;
    const ivaCalculado = ivaManual ?? base * (percent / 100);
    setIva(decimalText(ivaCalculado));
    setTotal(decimalText(base + ivaCalculado));
  }

  function calcularBaseDesdeTotal() {
    const totalNumber = decimalNumber(total);
    if (totalNumber === null) {
      return;
    }

    const ivaManual = decimalNumber(iva);
    if (ivaManual !== null) {
      setBaseImponible(decimalText(totalNumber - ivaManual));
      return;
    }

    const percent = decimalNumber(ivaPorcentaje) ?? 21;
    const base = totalNumber / (1 + percent / 100);
    const ivaCalculado = totalNumber - base;
    setBaseImponible(decimalText(base));
    setIva(decimalText(ivaCalculado));
  }

  function usarSumaLineas() {
    setBaseImponible(decimalText(importeLineas));
    const percent = decimalNumber(ivaPorcentaje) ?? 21;
    const ivaCalculado = importeLineas * (percent / 100);
    setIva(decimalText(ivaCalculado));
    setTotal(decimalText(importeLineas + ivaCalculado));
  }

  return (
    <form
      action={formAction}
      className="grid gap-5"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const formData = new FormData(form);
        const proveedorValue = formData.get("proveedor");
        if (typeof proveedorValue !== "string" || proveedorValue.trim() === "") {
          window.alert("El proveedor es obligatorio.");
          event.preventDefault();
        }
      }}
    >
      {gasto ? <input type="hidden" name="gastoId" value={gasto.id} /> : null}
      <input type="hidden" name="archivoUrl" value={fileUrl} />

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-neutral-950">
          Datos generales
        </h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tipo de gasto</span>
            <select
              className={inputClass}
              name="tipoGasto"
              value={tipoGasto}
              onChange={(event) => setTipoGasto(event.target.value)}
              required
            >
              {tiposGasto.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Proveedor</span>
            <input
              className={inputClass}
              name="proveedor"
              value={proveedor}
              onChange={(event) => setProveedor(event.target.value)}
              required
            />
          </label>
          <Field label="Fecha" name="fecha" type="date" defaultValue={values.fecha} />
          <SelectField
            label="Tipo de documento"
            name="tipoDocumento"
            options={tiposDocumentoGasto}
            defaultValue={values.tipoDocumento}
          />
          <Field
            label="Número"
            name="numeroDocumento"
            defaultValue={values.numeroDocumento}
          />
          <SelectField
            label="Categoría"
            name="categoria"
            options={categoriasGasto}
            defaultValue={values.categoria || "Otros"}
          />
          <SelectField
            label="Forma de pago"
            name="formaPago"
            options={formasPagoGasto}
            defaultValue={values.formaPago}
          />
          <Field
            label="Cliente vinculado"
            name="clienteId"
            type="number"
            defaultValue={gasto?.clienteId?.toString() ?? ""}
            placeholder="ID de cliente"
          />
        </div>

        <div className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Base imponible</span>
              <DecimalInput
                name="baseImponible"
                value={baseImponible}
                onChange={setBaseImponible}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>IVA %</span>
              <DecimalInput
                name="ivaPorcentaje"
                value={ivaPorcentaje}
                onChange={setIvaPorcentaje}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>IVA</span>
              <DecimalInput name="iva" value={iva} onChange={setIva} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Total</span>
              <DecimalInput name="total" value={total} onChange={setTotal} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={calcularTotalDesdeBase}
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Calcular total
            </button>
            <button
              type="button"
              onClick={calcularBaseDesdeTotal}
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Calcular base
            </button>
            {isMateriales ? (
              <button
                type="button"
                onClick={usarSumaLineas}
                className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
              >
                Usar suma líneas ({decimalText(importeLineas)})
              </button>
            ) : null}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Descripción</span>
          <input
            className={inputClass}
            name="descripcion"
            defaultValue={values.descripcion}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Observaciones</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            name="observaciones"
            defaultValue={values.observaciones}
          />
        </label>
      </section>

      {isMateriales ? (
        <LineasTable
          initial={lineas}
          materiales={materiales}
          gastoId={gasto?.id}
          showMedida={showMedidaLineas}
          onImportesChange={setImporteLineas}
        />
      ) : null}

      {state.message ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
