"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteCalculoArmario,
  saveCalculoArmario,
  type CalculoArmarioInput,
  type CalculoArmarioState,
} from "./actions";

const standardBoardArea = 2.44 * 1.22;
const ivaRate = 0.21;
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const selectClass = inputClass;
const labelClass = "text-sm font-semibold text-neutral-800";
const initialState: CalculoArmarioState = { status: "idle", message: null };
const tarifaNames = {
  bisagra: "Bisagra Blum",
  guiaCajon: "Guía cajón",
  barraColgar: "Barra colgar",
  soporteBarra: "Soporte barra",
  canto: "Canto 0.8 mm",
  horaTaller: "Hora taller",
  horaMontaje: "Hora montaje",
  desplazamiento: "Desplazamiento",
  margenComercial: "Margen comercial",
  precioArmarioM2: "Precio armario m²",
} as const;

const laborRules = {
  horasPorTableroPrincipal: 2,
  horasPorBisagra: 15 / 60,
  horasPorCajon: 20 / 60,
  horasPorPuerta: 30 / 60,
  horasMontajePorModulo: 45 / 60,
} as const;

export type TarifaInternaDisponible = {
  categoria: string;
  nombre: string;
  unidad: string;
  precio: number;
};

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
  precioTableroM2: number;
  precioTraseraM2: number;
  precioCantoMl: number;
  precioBisagraUnidad: number;
  precioGuiaCajonJuego: number;
  precioBarraMl: number;
  precioSoporteBarraUnidad: number;
  costeHoraTaller: number;
  horasTaller: number;
  costeHoraMontaje: number;
  horasMontaje: number;
  margenComercial: number;
  precioJuanserM2: number;
  costeMateriales: number;
  costeManoObra: number;
  costeTransporte: number;
  costeTotal: number;
  precioCostes: number;
  precioJuanser: number;
  precioFinal: number;
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
  costeTableroPrincipal: number;
  costeTrasera: number;
  costeCanto: number;
  costeBisagras: number;
  costeGuias: number;
  costeBarras: number;
  costeSoportes: number;
  costeMateriales: number;
  horasTaller: number;
  horasMontaje: number;
  costeManoObra: number;
  costeTransporte: number;
  costeTotal: number;
  margenComercial: number;
  precioCostes: number;
  precioCostesConIva: number;
  precioJuanser: number;
  precioFinal: number;
  precioFinalConIva: number;
  diferenciaJuanser: number;
  diferenciaJuanserPorcentaje: number | null;
  notas: string[];
  missingTarifas: string[];
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function tariffKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function materialTariffName(materialPrincipal: string, grosorPrincipalMm: number) {
  return `${materialPrincipal} ${grosorPrincipalMm} mm`;
}

function traseraTariffName(tipoTrasera: string) {
  return tipoTrasera === "sin trasera" ? null : `Trasera MDF ${tipoTrasera}`;
}

function tarifaLookup(tarifas: TarifaInternaDisponible[]) {
  const lookup = new Map<string, TarifaInternaDisponible>();
  for (const tarifa of tarifas) {
    const key = tariffKey(tarifa.nombre);
    if (!lookup.has(key)) {
      lookup.set(key, tarifa);
    }
  }

  return lookup;
}

function tariffPrice(
  lookup: Map<string, TarifaInternaDisponible>,
  name: string | null,
  unitForM2 = false,
) {
  if (!name) {
    return 0;
  }

  const tarifa = lookup.get(tariffKey(name));
  if (!tarifa) {
    return 0;
  }

  if (unitForM2 && tarifa.unidad.toLowerCase() === "tablero") {
    return round(tarifa.precio / standardBoardArea, 2);
  }

  return tarifa.precio;
}

function estimatedLaborHours(input: Pick<
  CalculoArmarioInput,
  | "anchoCm"
  | "altoCm"
  | "fondoCm"
  | "tipoPuertas"
  | "numeroPuertas"
  | "numeroModulos"
  | "numeroCajones"
  | "numeroBaldas"
>) {
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
  const metrosTableroPrincipal =
    (laterales + techoSuelo + divisiones + puertas + baldas + cajonesPrincipal) * 1.15;
  const tablerosPrincipales = Math.ceil(metrosTableroPrincipal / standardBoardArea);
  const bisagras = input.tipoPuertas === "abatibles" ? input.numeroPuertas * 4 : 0;

  return {
    horasTaller: round(
      tablerosPrincipales * laborRules.horasPorTableroPrincipal +
        bisagras * laborRules.horasPorBisagra +
        input.numeroCajones * laborRules.horasPorCajon +
        input.numeroPuertas * laborRules.horasPorPuerta,
      2,
    ),
    horasMontaje: round(input.numeroModulos * laborRules.horasMontajePorModulo, 2),
  };
}

function economicDefaults(
  tarifas: TarifaInternaDisponible[],
  base: Pick<
    CalculoArmarioInput,
    "materialPrincipal" | "grosorPrincipalMm" | "tipoTrasera"
  >,
) {
  const lookup = tarifaLookup(tarifas);
  return {
    precioTableroM2: tariffPrice(
      lookup,
      materialTariffName(base.materialPrincipal, base.grosorPrincipalMm),
      true,
    ),
    precioTraseraM2: tariffPrice(lookup, traseraTariffName(base.tipoTrasera), true),
    precioCantoMl: tariffPrice(lookup, tarifaNames.canto),
    precioBisagraUnidad: tariffPrice(lookup, tarifaNames.bisagra),
    precioGuiaCajonJuego: tariffPrice(lookup, tarifaNames.guiaCajon),
    precioBarraMl: tariffPrice(lookup, tarifaNames.barraColgar),
    precioSoporteBarraUnidad: tariffPrice(lookup, tarifaNames.soporteBarra),
    costeTransporte: tariffPrice(lookup, tarifaNames.desplazamiento),
    costeHoraTaller: tariffPrice(lookup, tarifaNames.horaTaller),
    costeHoraMontaje: tariffPrice(lookup, tarifaNames.horaMontaje),
    margenComercial: tariffPrice(lookup, tarifaNames.margenComercial),
    precioJuanserM2: tariffPrice(lookup, tarifaNames.precioArmarioM2),
  };
}

function initialInput(tarifas: TarifaInternaDisponible[]): CalculoArmarioInput {
  const base = {
    anchoCm: 240,
    altoCm: 240,
    fondoCm: 60,
    tipoPuertas: "abatibles",
    numeroPuertas: 4,
    numeroModulos: 3,
    numeroCajones: 2,
    numeroBaldas: 4,
    numeroBarras: 2,
    tipoTrasera: "10 mm",
    materialPrincipal: "MDF",
    grosorPrincipalMm: 19,
    observaciones: "",
  };
  const labor = estimatedLaborHours(base);

  return {
    ...base,
    ...economicDefaults(tarifas, base),
    horasTaller: labor.horasTaller,
    horasMontaje: labor.horasMontaje,
  };
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
  const tablerosPrincipales = Math.ceil(metrosTableroPrincipal / standardBoardArea);
  const tablerosTrasera = Math.ceil(metrosTrasera / standardBoardArea);
  const costeTableroPrincipal = metrosTableroPrincipal * input.precioTableroM2;
  const costeTrasera = metrosTrasera * input.precioTraseraM2;
  const costeCanto = metrosCanto * input.precioCantoMl;
  const costeBisagras = bisagras * input.precioBisagraUnidad;
  const costeGuias = guiasCajon * input.precioGuiaCajonJuego;
  const costeBarras = metrosBarra * input.precioBarraMl;
  const costeSoportes = input.numeroBarras * 2 * input.precioSoporteBarraUnidad;
  const costeMateriales =
    costeTableroPrincipal +
    costeTrasera +
    costeCanto +
    costeBisagras +
    costeGuias +
    costeBarras +
    costeSoportes;
  const horasTaller = input.horasTaller;
  const horasMontaje = input.horasMontaje;
  const costeManoObra =
    horasTaller * input.costeHoraTaller + horasMontaje * input.costeHoraMontaje;
  const costeTransporte = input.costeTransporte;
  const costeTotal = costeMateriales + costeManoObra + costeTransporte;
  const margenComercial = input.margenComercial;
  const precioCostes = costeTotal * (1 + margenComercial / 100);
  const precioJuanser = metrosFrontales * input.precioJuanserM2;
  const precioFinal = precioCostes;
  const diferenciaJuanser = precioCostes - precioJuanser;
  const diferenciaJuanserPorcentaje =
    precioCostes > 0
      ? Math.abs(diferenciaJuanser) / precioCostes * 100
      : null;
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
    tablerosPrincipales,
    metrosTrasera: round(metrosTrasera, 3),
    tablerosTrasera,
    metrosCanto: round(metrosCanto, 2),
    bisagras,
    guiasCajon,
    metrosBarra: round(metrosBarra, 2),
    complejidad,
    costeTableroPrincipal: round(costeTableroPrincipal, 2),
    costeTrasera: round(costeTrasera, 2),
    costeCanto: round(costeCanto, 2),
    costeBisagras: round(costeBisagras, 2),
    costeGuias: round(costeGuias, 2),
    costeBarras: round(costeBarras, 2),
    costeSoportes: round(costeSoportes, 2),
    costeMateriales: round(costeMateriales, 2),
    horasTaller: round(horasTaller, 2),
    horasMontaje: round(horasMontaje, 2),
    costeManoObra: round(costeManoObra, 2),
    costeTransporte: round(costeTransporte, 2),
    costeTotal: round(costeTotal, 2),
    margenComercial: round(margenComercial, 2),
    precioCostes: round(precioCostes, 2),
    precioCostesConIva: round(precioCostes * (1 + ivaRate), 2),
    precioJuanser: round(precioJuanser, 2),
    precioFinal: round(precioFinal, 2),
    precioFinalConIva: round(precioFinal * (1 + ivaRate), 2),
    diferenciaJuanser: round(diferenciaJuanser, 2),
    diferenciaJuanserPorcentaje:
      diferenciaJuanserPorcentaje === null
        ? null
        : round(diferenciaJuanserPorcentaje, 2),
    notas,
    missingTarifas: [],
  };
}

function numberText(value: number, decimals = 2) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function moneyText(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
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

function MetricBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border-b border-neutral-200 pb-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function comparisonClass(percentage: number | null) {
  if (percentage === null || percentage > 15) {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (percentage >= 5) {
    return "border-yellow-300 bg-yellow-50 text-yellow-800";
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-800";
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
  tarifas,
}: {
  initialCalculos: SavedCalculoArmario[];
  tarifas: TarifaInternaDisponible[];
}) {
  const [input, setInput] = useState<CalculoArmarioInput>(() => initialInput(tarifas));
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
              : input.precioTableroM2 < 0 ||
                  input.precioTraseraM2 < 0 ||
                  input.precioCantoMl < 0 ||
                  input.precioBisagraUnidad < 0 ||
                  input.precioGuiaCajonJuego < 0 ||
                  input.precioBarraMl < 0 ||
                  input.precioSoporteBarraUnidad < 0 ||
                  input.costeTransporte < 0 ||
                  input.costeHoraTaller < 0 ||
                  input.horasTaller < 0 ||
                  input.costeHoraMontaje < 0 ||
                  input.horasMontaje < 0 ||
                  input.margenComercial < 0 ||
                  input.precioJuanserM2 < 0
                ? "Los valores economicos no pueden ser negativos."
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
      ...(key === "materialPrincipal" || key === "grosorPrincipalMm"
        ? {
            precioTableroM2: economicDefaults(tarifas, {
              materialPrincipal:
                key === "materialPrincipal" ? String(value) : current.materialPrincipal,
              grosorPrincipalMm:
                key === "grosorPrincipalMm" ? Number(value) : current.grosorPrincipalMm,
              tipoTrasera: current.tipoTrasera,
            }).precioTableroM2,
          }
        : {}),
      ...(key === "tipoTrasera"
        ? {
            precioTraseraM2: economicDefaults(tarifas, {
              materialPrincipal: current.materialPrincipal,
              grosorPrincipalMm: current.grosorPrincipalMm,
              tipoTrasera: String(value),
            }).precioTraseraM2,
          }
        : {}),
    }));
  }

  function applySuggestedHours() {
    const labor = estimatedLaborHours(input);
    setState(initialState);
    setInput((current) => ({
      ...current,
      horasTaller: labor.horasTaller,
      horasMontaje: labor.horasMontaje,
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
            Calculo interno orientativo de materiales, mano de obra y precio recomendado.
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

        <div className="grid gap-4 border-t border-neutral-200 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Datos economicos del calculo
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Valores precargados desde tarifas internas y editables para este trabajo.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
              onClick={applySuggestedHours}
            >
              Usar horas sugeridas
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Precio tablero m2">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioTableroM2}
                onChange={(event) => update("precioTableroM2", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio trasera m2">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioTraseraM2}
                onChange={(event) => update("precioTraseraM2", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio canto ml">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioCantoMl}
                onChange={(event) => update("precioCantoMl", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio bisagra unidad">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioBisagraUnidad}
                onChange={(event) => update("precioBisagraUnidad", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio guia cajon juego">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioGuiaCajonJuego}
                onChange={(event) => update("precioGuiaCajonJuego", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio barra ml">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioBarraMl}
                onChange={(event) => update("precioBarraMl", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio soporte barra unidad">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioSoporteBarraUnidad}
                onChange={(event) =>
                  update("precioSoporteBarraUnidad", Number(event.target.value))
                }
              />
            </Field>
            <Field label="Coste transporte">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.costeTransporte}
                onChange={(event) => update("costeTransporte", Number(event.target.value))}
              />
            </Field>
            <Field label="Coste hora taller">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.costeHoraTaller}
                onChange={(event) => update("costeHoraTaller", Number(event.target.value))}
              />
            </Field>
            <Field label="Horas taller">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.25"
                value={input.horasTaller}
                onChange={(event) => update("horasTaller", Number(event.target.value))}
              />
            </Field>
            <Field label="Coste hora montaje">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.costeHoraMontaje}
                onChange={(event) => update("costeHoraMontaje", Number(event.target.value))}
              />
            </Field>
            <Field label="Horas montaje">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.25"
                value={input.horasMontaje}
                onChange={(event) => update("horasMontaje", Number(event.target.value))}
              />
            </Field>
            <Field label="Margen comercial">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.margenComercial}
                onChange={(event) => update("margenComercial", Number(event.target.value))}
              />
            </Field>
            <Field label="Precio Juanser m2">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={input.precioJuanserM2}
                onChange={(event) => update("precioJuanserM2", Number(event.target.value))}
              />
            </Field>
          </div>
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

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 border-b border-neutral-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Resumen economico
            </p>
            <h2 className="text-lg font-semibold text-neutral-950">
              Coste total y precio recomendado
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock
              label="Materiales"
              value={moneyText(result.costeMateriales)}
              detail={`Tablero ${moneyText(result.costeTableroPrincipal)} · trasera ${moneyText(result.costeTrasera)}`}
            />
            <MetricBlock
              label="Mano de obra"
              value={moneyText(result.costeManoObra)}
              detail={`${numberText(result.horasTaller)} h taller · ${numberText(result.horasMontaje)} h montaje`}
            />
            <MetricBlock
              label="Transporte"
              value={moneyText(result.costeTransporte)}
              detail="Valor editable en este calculo."
            />
            <MetricBlock
              label="Coste total"
              value={moneyText(result.costeTotal)}
              detail="Materiales, mano de obra y transporte."
            />
            <MetricBlock
              label="Margen comercial"
              value={`${numberText(result.margenComercial)} %`}
              detail="Aplicado sobre coste total."
            />
            <MetricBlock
              label="Precio recomendado"
              value={moneyText(result.precioCostes)}
              detail={`${moneyText(result.precioCostesConIva)} con IVA`}
            />
          </div>
          <div className="mt-4 grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold text-neutral-950">Desglose de materiales</p>
            <p>
              Canto {moneyText(result.costeCanto)} · bisagras {moneyText(result.costeBisagras)} · guias{" "}
              {moneyText(result.costeGuias)} · barras {moneyText(result.costeBarras)} · soportes{" "}
              {moneyText(result.costeSoportes)}
            </p>
            {result.missingTarifas.length > 0 ? (
              <p className="font-semibold text-rose-700">
                Tarifas pendientes: {result.missingTarifas.join(", ")}.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Comparativa Juanser
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              Costes frente a m2
            </h2>
          </div>
          <div className="mt-4 grid gap-3">
            <MetricBlock
              label="Precio segun costes"
              value={moneyText(result.precioCostes)}
              detail="Sin IVA."
            />
            <MetricBlock
              label="Sistema Juanser"
              value={moneyText(result.precioJuanser)}
              detail="m2 frontal por precio Juanser m2 usado."
            />
            <div
              className={`rounded-md border p-4 shadow-sm ${comparisonClass(
                result.diferenciaJuanserPorcentaje,
              )}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Diferencia
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {moneyText(result.diferenciaJuanser)}
              </p>
              <p className="mt-1 text-sm">
                {result.diferenciaJuanserPorcentaje === null
                  ? "Sin base de comparacion."
                  : `${numberText(result.diferenciaJuanserPorcentaje)} % de desviacion.`}
              </p>
            </div>
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
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Medidas</th>
                  <th className="px-4 py-3">Puertas</th>
                  <th className="px-4 py-3 text-right">Tablero</th>
                  <th className="px-4 py-3 text-right">Trasera</th>
                  <th className="px-4 py-3 text-right">Canto</th>
                  <th className="px-4 py-3 text-right">Coste</th>
                  <th className="px-4 py-3 text-right">Precio</th>
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
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {moneyText(calculo.costeTotal)}
                        <p className="mt-1 text-xs text-neutral-500">
                          Mat. {moneyText(calculo.costeMateriales)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {numberText(calculo.horasTaller)} h taller ·{" "}
                          {numberText(calculo.horasMontaje)} h montaje
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-700">
                        {moneyText(calculo.precioFinal)}
                        <p className="mt-1 text-xs text-neutral-500">
                          Juanser {moneyText(calculo.precioJuanser)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Margen {numberText(calculo.margenComercial)} % ·{" "}
                          {moneyText(calculo.precioJuanserM2)}/m2
                        </p>
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
                    <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
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
