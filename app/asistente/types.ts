export type AnalisisSolicitudIA = {
  nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  localidad?: string;
  codigoPostal?: string;
  provincia?: string;
  tipoTrabajo?: string;
  medidas?: string;
  materiales?: string;
  urgencia?: string;
  fechaHora?: string;
  solicitaCita: boolean;
  preguntaPrecio: boolean;
  aceptaPresupuesto: boolean;
  rechazaPresupuesto: boolean;
  necesitaSeguimiento: boolean;
  enviaraFotos: boolean;
  enviaraPlanos: boolean;
  datosFaltantes: string[];
  resumenInterno: string;
  respuestaWhatsapp: string;
};

export type AsistenteActionResult = {
  ok: boolean;
  message: string;
  href?: string;
  clienteId?: number;
};

