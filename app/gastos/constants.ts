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

export const tiposDocumentoGasto = [
  "factura",
  "albaran",
  "ticket",
  "otro",
] as const;

export const formasPagoGasto = [
  "Transferencia",
  "Efectivo",
  "Tarjeta",
  "Bizum",
  "Domiciliación",
  "Otro",
] as const;

export type GastoAnalizado = {
  proveedor: string;
  fecha: string;
  tipoDocumento: string;
  numeroDocumento: string;
  categoria: string;
  baseImponible: string;
  iva: string;
  total: string;
  formaPago: string;
  descripcion: string;
  observaciones: string;
};

export const emptyGastoAnalizado: GastoAnalizado = {
  proveedor: "",
  fecha: "",
  tipoDocumento: "",
  numeroDocumento: "",
  categoria: "",
  baseImponible: "",
  iva: "",
  total: "",
  formaPago: "",
  descripcion: "",
  observaciones: "",
};
