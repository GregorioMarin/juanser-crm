export const estadosComerciales = [
  "PENDIENTE_DAR_PRECIO",
  "PENDIENTE_RESPUESTA",
  "ACEPTADO",
  "PERDIDO",
] as const;

export const estadosProduccion = [
  "PENDIENTE_PAGO_50",
  "PENDIENTE_PEDIR_MATERIALES",
  "PENDIENTE_FABRICAR",
  "EN_FABRICACION",
  "PENDIENTE_INSTALACION",
  "FINALIZADO",
] as const;

export type EstadoComercial = (typeof estadosComerciales)[number];
export type EstadoProduccion = (typeof estadosProduccion)[number];

export const estadoComercialLabels: Record<EstadoComercial, string> = {
  PENDIENTE_DAR_PRECIO: "Pendiente dar precio",
  PENDIENTE_RESPUESTA: "Pendiente respuesta",
  ACEPTADO: "Aceptado",
  PERDIDO: "Perdido",
};

export const estadoProduccionLabels: Record<EstadoProduccion, string> = {
  PENDIENTE_PAGO_50: "Pendiente pago 50%",
  PENDIENTE_PEDIR_MATERIALES: "Pendiente pedir materiales",
  PENDIENTE_FABRICAR: "Pendiente empezar a fabricar",
  EN_FABRICACION: "En fabricación",
  PENDIENTE_INSTALACION: "Pendiente instalación",
  FINALIZADO: "Finalizado",
};

export const estadoComercialStyles: Record<EstadoComercial, string> = {
  PENDIENTE_DAR_PRECIO: "bg-orange-100 text-orange-950 ring-orange-200",
  PENDIENTE_RESPUESTA: "bg-sky-100 text-sky-900 ring-sky-200",
  ACEPTADO: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  PERDIDO: "bg-rose-100 text-rose-900 ring-rose-200",
};

export const estadoProduccionStyles: Record<EstadoProduccion, string> = {
  PENDIENTE_PAGO_50: "bg-yellow-100 text-yellow-950 ring-yellow-200",
  PENDIENTE_PEDIR_MATERIALES: "bg-blue-100 text-blue-900 ring-blue-200",
  PENDIENTE_FABRICAR: "bg-stone-200 text-stone-950 ring-stone-300",
  EN_FABRICACION: "bg-violet-100 text-violet-900 ring-violet-200",
  PENDIENTE_INSTALACION: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  FINALIZADO: "bg-teal-100 text-teal-900 ring-teal-200",
};

export function estadoComercialLabel(estado: string) {
  return (
    estadoComercialLabels[estado as EstadoComercial] ??
    estado.replaceAll("_", " ").toLocaleLowerCase("es-ES")
  );
}

export function estadoProduccionLabel(estado: string) {
  return (
    estadoProduccionLabels[estado as EstadoProduccion] ??
    estado.replaceAll("_", " ").toLocaleLowerCase("es-ES")
  );
}

export function isEstadoComercial(value?: string | null): value is EstadoComercial {
  return estadosComerciales.includes(value as EstadoComercial);
}

export function isEstadoProduccion(
  value?: string | null,
): value is EstadoProduccion {
  return estadosProduccion.includes(value as EstadoProduccion);
}

