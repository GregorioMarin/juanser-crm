export const categoriasGasto = [
  "Tableros",
  "Herrajes",
  "Barnices / pinturas",
  "Ferretería",
  "Herramientas",
  "Transporte",
  "Cristales",
  "Maquinaria",
  "Material eléctrico",
  "Consumibles",
  "Subcontratas",
  "Otros",
] as const;

export const tiposGasto = [
  "Materiales",
  "Vehículos",
  "Personal",
  "Herramientas",
  "Maquinaria",
  "Servicios externos",
  "Alquileres",
  "Suministros",
  "Impuestos",
  "Otros",
] as const;

export const tiposDocumentoGasto = [
  "ALBARAN",
  "FACTURA",
  "TICKET",
  "OTRO",
] as const;

export const tipoDocumentoLabels: Record<(typeof tiposDocumentoGasto)[number], string> = {
  ALBARAN: "Albarán",
  FACTURA: "Factura",
  TICKET: "Ticket",
  OTRO: "Otro",
};

export const formasPagoGasto = [
  "Transferencia",
  "Efectivo",
  "Tarjeta",
  "Bizum",
  "Domiciliación",
  "Otro",
] as const;

export type GastoAnalizado = {
  tipoGasto: string;
  proveedorTipo: string;
  proveedor: string;
  fecha: string;
  tipoDocumento: string;
  numeroInterno?: string;
  numeroDocumento: string;
  categoria: string;
  baseImponible: string;
  iva: string;
  total: string;
  formaPago: string;
  descripcion: string;
  observaciones: string;
  lineas: GastoLineaAnalizada[];
};

export type GastoLineaAnalizada = {
  id?: string;
  materialId?: string | null;
  codigoInterno?: string | null;
  codigoMaterialDetectado?: string | null;
  descripcion: string;
  cantidad: string | null;
  precioUnitario: string | null;
  unidadMedidaProveedor: string | null;
  piezas: string | null;
  medida: string | null;
  precioUnidadMedida: string | null;
  descuentoPorcentaje: string | null;
  importe: string | null;
  esPorte: boolean;
  esPendienteServir: boolean;
  pedidoProveedor: string | null;
};

export const emptyGastoAnalizado: GastoAnalizado = {
  tipoGasto: "Otros",
  proveedorTipo: "GENERICO",
  proveedor: "",
  fecha: "",
  tipoDocumento: "",
  numeroInterno: "",
  numeroDocumento: "",
  categoria: "",
  baseImponible: "",
  iva: "",
  total: "",
  formaPago: "",
  descripcion: "",
  observaciones: "",
  lineas: [],
};
