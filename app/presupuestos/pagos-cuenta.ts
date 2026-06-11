type PagoCuentaResumen = {
  importe: unknown;
  presupuestoId?: number | null;
};

type PresupuestoResumen = {
  id: number;
  estado: string;
  pagosCuenta?: PagoCuentaResumen[];
};

type ClientePagosResumen = {
  presupuestos: PresupuestoResumen[];
  pagosCuenta: PagoCuentaResumen[];
};

const estadosPresupuestoActivos = ["ACEPTADO", "INSTALADO"];

function sumImportes(pagos: PagoCuentaResumen[]) {
  return pagos.reduce((sum, pago) => sum + Number(pago.importe), 0);
}

export function isPresupuestoActivoParaPagos(presupuesto: PresupuestoResumen) {
  return estadosPresupuestoActivos.includes(presupuesto.estado);
}

export function pagosSinPresupuesto(cliente: Pick<ClientePagosResumen, "pagosCuenta">) {
  return cliente.pagosCuenta.filter((pago) => pago.presupuestoId === null);
}

export function totalPagadoPresupuestoConCliente(
  presupuesto: PresupuestoResumen,
  cliente: ClientePagosResumen,
) {
  const pagosAsociados = sumImportes(presupuesto.pagosCuenta ?? []);
  const presupuestosActivos = cliente.presupuestos.filter(isPresupuestoActivoParaPagos);

  if (
    !isPresupuestoActivoParaPagos(presupuesto) ||
    presupuestosActivos.length !== 1 ||
    presupuestosActivos[0].id !== presupuesto.id
  ) {
    return pagosAsociados;
  }

  return pagosAsociados + sumImportes(pagosSinPresupuesto(cliente));
}
