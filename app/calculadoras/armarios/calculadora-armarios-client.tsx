"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteCalculoArmario,
  saveCalculoArmario,
  type CalculoArmarioInput,
  type CalculoArmarioState,
} from "./actions";

const standardBoardArea = 2.44 * 1.22;
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const selectClass = inputClass;
const labelClass = "text-sm font-semibold text-neutral-800";
const initialState: CalculoArmarioState = { status: "idle", message: null };

export type SavedCalculoArmario = {
  id: number;
  fecha: string;
  anchoCm: number;
  altoCm: number;
  fondoCm: number;
  tipoPuertas: string;
  numeroPuertas: number;
  numeroModulos: number;
  numeroCajones: number;
  numeroBaldas: number;
  numeroBarras: number;
  tipoTrasera: string;
  materialPrincipal: string;
  grosorPrincipalMm: number;
  observaciones: string | null;
  metrosFrontales: number;
  metrosTableroPrincipal: number;
  tablerosPrincipales: number;
  metrosTrasera: number;
  tablerosTrasera: number;
  metrosCanto: number;
  bisagras: number;
  guiasCajon: number;
  metrosBarra: number;
  complejidad: string;
};

type CalculoResult = {
  metrosFrontales: number;
  metrosTableroPrincipal: number;
  tablerosPrincipales: number;
  metrosTrasera: number;
  tablerosTrasera: number;
  metrosCanto: number;
  bisagras: number;
  guiasCajon: number;
  metrosBarra: number;
  complejidad: string;
  notas: string[];
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculate(input: CalculoArmarioInput): CalculoResult {
  const anchoM = input.anchoCm / 100;
  const altoM = input.altoCm / 100;
  const fondoM = input.fondoCm / 100;
  const modulos = Math.max(input.numeroModulos, 1);
  const moduloAnchoM = anchoM / modulos;
  const metrosFrontales = anchoM * altoM;
  const laterales = 2 * altoM * fondoM;
  const techoSuelo = 2 * anchoM * fondoM;
  const divisiones = Math.max(modulos - 1, 0) * altoM * fondoM;
  const puertas = input.tipoPuertas === "sin puertas" ? 0 : metrosFrontales;
  const baldas = input.numeroBaldas * moduloAnchoM * fondoM;
  const cajonesPrincipal =
    input.numeroCajones * (2 * fondoM * 0.2 + 2 * moduloAnchoM * 0.2);
  const tableroSinMerma =
    laterales + techoSuelo + divisiones + puertas + baldas + cajonesPrincipal;
  const metrosTableroPrincipal = tableroSinMerma * 1.15;
  const metrosTrasera = input.tipoTrasera === "sin trasera" ? 0 : metrosFrontales;
  const cantoCasco = 2 * altoM + 2 * anchoM + Math.max(modulos - 1, 0) * altoM;
  const cantoBaldas = input.numeroBaldas * moduloAnchoM;
  const cantoPuertas =
    input.tipoPuertas === "sin puertas"
      ? 0
      : input.numeroPuertas * 2 * (anchoM / Math.max(input.numeroPuertas, 1) + altoM);
  const cantoCajones = input.numeroCajones * 2 * (moduloAnchoM + 0.2);
  const metrosCanto = cantoCasco + cantoBaldas + cantoPuertas + cantoCajones;
  const bisagras = input.tipoPuertas === "abatibles" ? input.numeroPuertas * 4 : 0;
  const guiasCajon = input.numeroCajones;
  const metrosBarra = input.numeroBarras * moduloAnchoM;
  const complejidad =
    metrosFrontales > 6 ||
    input.numeroCajones >= 6 ||
    input.numeroPuertas >= 4 ||
    input.tipoPuertas === "correderas"
      ? "alta"
      : metrosFrontales > 3 ||
          input.numeroCajones > 2 ||
          input.numeroBaldas > 4 ||
          input.numeroBarras > 2 ||
          modulos > 2
        ? "media"
        : "baja";
  const notas = [
    "Tablero principal calculado con 15% de merma.",
    "Los cajones incluyen piezas principales estimadas; el fondo fino queda como nota tecnica.",
  ];

  if (input.tipoPuertas === "correderas") {
    notas.push("Herraje de puerta corredera pendiente de definir.");
  }

  if (input.tipoTrasera !== "sin trasera") {
    notas.push(`Trasera calculada en ${input.tipoTrasera} sobre ancho por alto.`);
  }

  return {
    metrosFrontales: round(metrosFrontales, 3),
    metrosTableroPrincipal: round(metrosTableroPrincipal, 3),
    tablerosPrincipales: Math.ceil(metrosTableroPrincipal / standardBoardArea),
    metrosTrasera: round(metrosTrasera, 3),
    tablerosTrasera: Math.ceil(metrosTrasera / standardBoardArea),
    metrosCanto: round(metrosCanto, 2),
    bisagras,
    guiasCajon,
    metrosBarra: round(metrosBarra, 2),
    complejidad,
    notas,
  };
}

function numberText(value: number, decimals = 2) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function ResultCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function CalculadoraArmariosClient({
  initialCalculos,
}: {
  initialCalculos: SavedCalculoArmario[];
}) {
  const [input, setInput] = useState<CalculoArmarioInput>({
    anchoCm: 240,
    altoCm: 240,
    fondoCm: 60,
    tipoPuertas: "abatibles",
    numeroPuertas: 4,
    numeroModulos: 3,
    numeroCajones: 2,
    numeroBaldas: 4,
    numeroBarras: 2,
    tipoTrasera: "3 mm",
    materialPrincipal: "melamina",
    grosorPrincipalMm: 19,
    observaciones: "",
  });
  const [calculos, setCalculos] = useState(initialCalculos);
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const result = useMemo(() => calculate(input), [input]);
  const validationError =
    input.anchoCm <= 0 || input.altoCm <= 0 || input.fondoCm <= 0
      ? "Ancho, alto y fondo deben ser mayores que 0."
      : input.numeroPuertas < 0 ||
          input.numeroModulos < 0 ||
          input.numeroCajones < 0 ||
          input.numeroBaldas < 0 ||
          input.numeroBarras < 0
        ? "Los contadores no pueden ser negativos."
        : input.numeroModulos < 1
          ? "El numero de modulos debe ser mayor que 0."
          : input.tipoPuertas === "sin puertas" && input.numeroPuertas !== 0
            ? "Si no hay puertas, el numero de puertas debe ser 0."
            : input.tipoPuertas !== "sin puertas" && input.numeroPuertas <= 0
              ? "Si hay puertas, el numero de puertas debe ser mayor que 0."
              : null;

  function update<K extends keyof CalculoArmarioInput>(
    key: K,
    value: CalculoArmarioInput[K],
  ) {
    setState(initialState);
    setInput((current) => ({
      ...current,
      [key]: value,
      ...(key === "tipoPuertas" && value === "sin puertas"
        ? { numeroPuertas: 0 }
        : {}),
    }));
  }

  function save() {
    if (validationError) {
      setState({ status: "error", message: validationError });
      return;
    }

    startTransition(async () => {
      const nextState = await saveCalculoArmario(input);
      setState(nextState);
      if (nextState.status === "success" && nextState.saved) {
        setCalculos((current) => [nextState.saved!, ...current].slice(0, 10));
      }
    });
  }

  function remove(id: number) {
    if (!window.confirm("¿Eliminar este calculo guardado?")) {
      return;
    }

    startTransition(async () => {
      await deleteCalculoArmario(id);
      setCalculos((current) => current.filter((calculo) => calculo.id !== id));
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Datos del armario</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Calculo interno orientativo de materiales, sin precios ni presupuesto.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ancho en cm">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.1"
              value={input.anchoCm}
              onChange={(event) => update("anchoCm", Number(event.target.value))}
              required
            />
          </Field>
          <Field label="Alto en cm">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.1"
              value={input.altoCm}
              onChange={(event) => update("altoCm", Number(event.target.value))}
              required
            />
          </Field>
          <Field label="Fondo en cm">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.1"
              value={input.fondoCm}
              onChange={(event) => update("fondoCm", Number(event.target.value))}
              required
            />
          </Field>
          <Field label="Tipo de puertas">
            <select
              className={selectClass}
              value={input.tipoPuertas}
              onChange={(event) => update("tipoPuertas", event.target.value)}
            >
              <option value="abatibles">Abatibles</option>
              <option value="correderas">Correderas</option>
              <option value="sin puertas">Sin puertas</option>
            </select>
          </Field>
          <Field label="Numero de puertas">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={input.numeroPuertas}
              onChange={(event) => update("numeroPuertas", Number(event.target.value))}
            />
          </Field>
          <Field label="Numero de modulos interiores">
            <input
              className={inputClass}
              type="number"
              min="1"
              step="1"
              value={input.numeroModulos}
              onChange={(event) => update("numeroModulos", Number(event.target.value))}
            />
          </Field>
          <Field label="Numero de cajones">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={input.numeroCajones}
              onChange={(event) => update("numeroCajones", Number(event.target.value))}
            />
          </Field>
          <Field label="Numero de baldas">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={input.numeroBaldas}
              onChange={(event) => update("numeroBaldas", Number(event.target.value))}
            />
          </Field>
          <Field label="Numero de barras de colgar">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={input.numeroBarras}
              onChange={(event) => update("numeroBarras", Number(event.target.value))}
            />
          </Field>
          <Field label="Tipo de trasera">
            <select
              className={selectClass}
              value={input.tipoTrasera}
              onChange={(event) => update("tipoTrasera", event.target.value)}
            >
              <option value="sin trasera">Sin trasera</option>
              <option value="3 mm">3 mm</option>
              <option value="10 mm">10 mm</option>
              <option value="16 mm">16 mm</option>
            </select>
          </Field>
          <Field label="Material principal">
            <select
              className={selectClass}
              value={input.materialPrincipal}
              onChange={(event) => update("materialPrincipal", event.target.value)}
            >
              <option value="MDF">MDF</option>
              <option value="melamina">Melamina</option>
              <option value="rechapado">Rechapado</option>
              <option value="contrachapado">Contrachapado</option>
            </select>
          </Field>
          <Field label="Grosor principal">
            <select
              className={selectClass}
              value={input.grosorPrincipalMm}
              onChange={(event) => update("grosorPrincipalMm", Number(event.target.value))}
            >
              <option value={16}>16 mm</option>
              <option value={19}>19 mm</option>
              <option value={22}>22 mm</option>
              <option value={30}>30 mm</option>
            </select>
          </Field>
          <label className="grid gap-1.5 md:col-span-2">
            <span className={labelClass}>Observaciones</span>
            <textarea
              className={`${inputClass} min-h-24`}
              value={input.observaciones}
              onChange={(event) => update("observaciones", event.target.value)}
              placeholder="Detalles internos de distribucion, acabado o dudas de fabricacion"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={() => setState({ status: "success", message: "Calculo actualizado." })}
          >
            Calcular
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Guardando..." : "Guardar calculo"}
          </button>
          {validationError ? (
            <p className="text-sm font-semibold text-rose-700">{validationError}</p>
          ) : state.message ? (
            <p
              className={`text-sm font-semibold ${
                state.status === "error" ? "text-rose-700" : "text-emerald-800"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard
            label="m2 frontal"
            value={`${numberText(result.metrosFrontales, 3)} m2`}
            detail="Ancho por alto."
          />
          <ResultCard
            label="Tablero principal"
            value={`${numberText(result.metrosTableroPrincipal, 3)} m2`}
            detail={`${result.tablerosPrincipales} tablero(s) de 2440 x 1220 mm.`}
          />
          <ResultCard
            label="Trasera estimada"
            value={`${numberText(result.metrosTrasera, 3)} m2`}
            detail={`${result.tablerosTrasera} tablero(s) de trasera.`}
          />
          <ResultCard
            label="Metros de canto"
            value={`${numberText(result.metrosCanto)} ml`}
            detail="Casco, puertas, baldas y frentes."
          />
          <ResultCard
            label="Herrajes"
            value={`${result.bisagras} bisagras`}
            detail={`${result.guiasCajon} juego(s) de guias de cajon.`}
          />
          <ResultCard
            label="Barra de colgar"
            value={`${numberText(result.metrosBarra)} ml`}
            detail="Estimado por ancho de modulo."
          />
          <ResultCard
            label="Complejidad"
            value={result.complejidad}
            detail="Baja, media o alta segun dimension y distribucion."
          />
          <div className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Notas tecnicas
            </p>
            <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
              {result.notas.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Ultimos calculos guardados
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Historial interno de calculos orientativos.
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Medidas</th>
                  <th className="px-4 py-3">Puertas</th>
                  <th className="px-4 py-3 text-right">Tablero</th>
                  <th className="px-4 py-3 text-right">Trasera</th>
                  <th className="px-4 py-3 text-right">Canto</th>
                  <th className="px-4 py-3">Complejidad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {calculos.length > 0 ? (
                  calculos.map((calculo) => (
                    <tr key={calculo.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                        {new Intl.DateTimeFormat("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(calculo.fecha))}
                      </td>
                      <td className="px-4 py-4 font-semibold text-neutral-950">
                        {numberText(calculo.anchoCm, 0)} x {numberText(calculo.altoCm, 0)} x{" "}
                        {numberText(calculo.fondoCm, 0)} cm
                        <p className="mt-1 text-xs font-normal text-neutral-500">
                          {calculo.materialPrincipal} {calculo.grosorPrincipalMm} mm
                        </p>
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {calculo.tipoPuertas} · {calculo.numeroPuertas}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {numberText(calculo.metrosTableroPrincipal, 3)} m2
                        <p className="mt-1 text-xs text-neutral-500">
                          {calculo.tablerosPrincipales} tablero(s)
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {numberText(calculo.metrosTrasera, 3)} m2
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {numberText(calculo.metrosCanto)} ml
                      </td>
                      <td className="px-4 py-4 font-semibold text-neutral-950">
                        {calculo.complejidad}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          onClick={() => remove(calculo.id)}
                          disabled={pending}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                      Todavia no hay calculos guardados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
