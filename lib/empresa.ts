export const empresa = {
  nombre: "Carpintería Juanser",
  direccion: {
    poligono: "P.I. San Nicolás",
    calle: "Calle San Nicolás 9 Nave 21",
    codigoPostal: "41500",
    localidad: "Alcalá de Guadaíra",
    provincia: "Sevilla",
  },
  telefonoPresupuestos: "601 50 77 29",
  email: "info@juanser.es",
  web: "https://juanser.es",
} as const;

export const direccionEmpresaCompleta = [
  empresa.direccion.poligono,
  empresa.direccion.calle,
  `${empresa.direccion.codigoPostal} ${empresa.direccion.localidad}`,
  empresa.direccion.provincia,
].join(", ");
