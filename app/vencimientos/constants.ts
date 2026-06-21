import type { FrecuenciaVencimiento } from "@/app/generated/prisma/client";

export const categoriasVencimiento = [
  "Seguros",
  "Impuestos",
  "Alquileres",
  "Gestoría",
  "Suministros",
  "Cuotas",
  "Mantenimientos",
  "Préstamos",
  "Vehículos",
  "ITV",
  "IBI",
  "Licencias",
  "Software",
  "Personal",
  "Otros",
] as const;

export const frecuenciasVencimiento = [
  "SEMANAL",
  "MENSUAL",
  "BIMESTRAL",
  "TRIMESTRAL",
  "SEMESTRAL",
  "ANUAL",
] as const satisfies readonly FrecuenciaVencimiento[];

export const frecuenciaLabels: Record<FrecuenciaVencimiento, string> = {
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
  BIMESTRAL: "Bimestral",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const estadoLabels = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
} as const;

export const origenLabels = {
  MANUAL: "Manual",
  RECURRENTE: "Recurrente",
} as const;

export const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
