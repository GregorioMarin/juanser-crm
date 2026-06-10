import Link from "next/link";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { PhoneContactActions } from "@/app/contact-actions";
import { ClienteEstadoFields } from "@/app/clientes/cliente-estado-fields";
import { DeleteClienteForm } from "@/app/clientes/delete-cliente-form";
import {
  estadoComercialLabel,
  estadoComercialStyles,
  estadoProduccionForComercial,
  estadoProduccionLabel,
  estadoProduccionNoAplica,
  estadoProduccionStyles,
  estadosComerciales,
  estadosProduccion,
  isEstadoComercial,
  isEstadoProduccion,
  isEstadoProduccionReal,
  type EstadoComercial,
  type EstadoProduccion,
} from "@/app/clientes/estados";
import { LocalidadField } from "@/app/clientes/localidad-field";
import { localidades } from "@/app/clientes/localidades";
import {
  motivoRechazoToParam,
  motivosRechazo,
} from "@/app/clientes/motivos-rechazo";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

const origenesContacto = [
  "WhatsApp",
  "Teléfono",
  "Email",
  "Formulario web",
  "Visita presencial",
  "Otro",
] as const;

const tiposCliente = [
  "Usuario final",
  "Arquitecto",
  "Constructora",
  "Tienda",
  "Otros",
] as const;

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`El campo ${key} es obligatorio.`);
  }

  return value;
}

function estadoComercialValue(formData: FormData) {
  const value = optionalString(formData, "estadoComercial") ?? estadosComerciales[0];
  if (!isEstadoComercial(value)) {
    throw new Error("Estado comercial no valido.");
  }

  return value;
}

function estadoProduccionValue(formData: FormData, estadoComercial: string) {
  if (estadoComercial !== "ACEPTADO") {
    return estadoProduccionNoAplica;
  }

  const value = optionalString(formData, "estadoProduccion");
  if (!isEstadoProduccionReal(value)) {
    throw new Error("Estado de produccion no valido.");
  }

  return value;
}

function origenContactoValue(formData: FormData) {
  const value = optionalString(formData, "origenContacto") ?? "WhatsApp";
  if (!origenesContacto.includes(value as (typeof origenesContacto)[number])) {
    throw new Error("Origen del contacto no valido.");
  }

  return value;
}

function tipoClienteValue(formData: FormData) {
  const value = optionalString(formData, "tipoCliente") ?? "Usuario final";
  if (!tiposCliente.includes(value as (typeof tiposCliente)[number])) {
    throw new Error("Tipo de cliente no valido.");
  }

  return value;
}

function motivoRechazoValue(formData: FormData, estadoComercial: string) {
  if (estadoComercial !== "PERDIDO") {
    return null;
  }

  const value = optionalString(formData, "motivoRechazo") ?? motivosRechazo[0];
  if (!motivosRechazo.includes(value as (typeof motivosRechazo)[number])) {
    throw new Error("Motivo de rechazo no valido.");
  }

  return value;
}

function localidadValue(formData: FormData) {
  const selected =
    optionalString(formData, "localidadSeleccionada") ?? localidades[0];
  if (!localidades.includes(selected as (typeof localidades)[number])) {
    throw new Error("Localidad no valida.");
  }

  if (selected === "Otro") {
    return requiredString(formData, "localidadOtro");
  }

  return selected;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function presupuestoValue(formData: FormData, key = "presupuesto") {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`El campo ${key} debe ser un importe valido.`);
  }

  return normalized;
}

function clienteData(formData: FormData) {
  const estado = estadoComercialValue(formData);

  return {
    nombre: requiredString(formData, "nombre"),
    telefono: optionalString(formData, "telefono"),
    email: optionalString(formData, "email"),
    direccion: optionalString(formData, "direccion"),
    localidad: localidadValue(formData),
    origenContacto: origenContactoValue(formData),
    tipoCliente: tipoClienteValue(formData),
    motivoRechazo: motivoRechazoValue(formData, estado),
    estadoProduccion: estadoProduccionValue(formData, estado),
    fechaMedicion: optionalDate(formData, "fechaMedicion"),
    fechaInstalacion: optionalDate(formData, "fechaInstalacion"),
    importeAceptado: presupuestoValue(formData, "importeAceptado"),
    presupuesto: presupuestoValue(formData),
    fechaAlta: optionalDate(formData, "fechaAlta") ?? new Date(),
    fechaSeguimiento: optionalDate(formData, "fechaSeguimiento"),
    estado,
    observaciones: optionalString(formData, "observaciones"),
  };
}

async function createCliente(formData: FormData) {
  "use server";

  const cliente = await prisma.cliente.create({
    data: clienteData(formData),
  });
  await registrarActividadCliente({
    clienteId: cliente.id,
    tipo: "CLIENTE_CREADO",
    descripcion: "Cliente creado",
  });

  revalidatePath("/clientes");
  revalidatePath("/clientes/perdidos");
}

async function getClientes(
  query: string,
  estadoComercial: EstadoComercial | null,
  estadoProduccion: EstadoProduccion | null,
) {
  const andFilters: Prisma.ClienteWhereInput[] = [];

  if (query) {
    andFilters.push({
      OR: [
        { nombre: { contains: query, mode: "insensitive" } },
        { telefono: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (estadoComercial) {
    andFilters.push({ estado: estadoComercial });
  }

  if (estadoProduccion === estadoProduccionNoAplica) {
    andFilters.push({
      OR: [
        { estadoProduccion: estadoProduccionNoAplica },
        { estado: { not: "ACEPTADO" } },
      ],
    });
  } else if (estadoProduccion) {
    andFilters.push({
      estado: "ACEPTADO",
      estadoProduccion,
    });
  }

  return prisma.cliente.findMany({
    where: andFilters.length > 0 ? { AND: andFilters } : {},
    orderBy: { fechaAlta: "desc" },
  });
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

async function getSeguimientosPendientes() {
  return prisma.cliente.findMany({
    where: {
      fechaSeguimiento: {
        lte: endOfToday(),
      },
      estado: {
        not: "PERDIDO",
      },
    },
    orderBy: { fechaSeguimiento: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      estado: true,
      fechaSeguimiento: true,
    },
  });
}

async function getSeguimientosFuturos() {
  return prisma.cliente.findMany({
    where: {
      fechaSeguimiento: {
        gt: endOfToday(),
      },
      estado: {
        not: "PERDIDO",
      },
    },
    orderBy: { fechaSeguimiento: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      estado: true,
      fechaSeguimiento: true,
    },
  });
}

async function getResumen() {
  const [
    pendienteDarPrecio,
    citaPendiente,
    pendienteRespuesta,
    aceptados,
    perdidos,
    noAplica,
    pendientePago50,
    pendientePedirMateriales,
    pendienteFabricar,
    enFabricacion,
    pendienteInstalacion,
    finalizados,
    clientesParaTotales,
    importeAceptadoTotal,
    perdidosPorMotivo,
    clientesPerdidosPorMotivo,
  ] = await Promise.all([
    prisma.cliente.count({ where: { estado: "PENDIENTE_DAR_PRECIO" } }),
    prisma.cliente.count({ where: { estado: "CITA_PENDIENTE" } }),
    prisma.cliente.count({ where: { estado: "PENDIENTE_RESPUESTA" } }),
    prisma.cliente.count({ where: { estado: "ACEPTADO" } }),
    prisma.cliente.count({ where: { estado: "PERDIDO" } }),
    prisma.cliente.count({
      where: {
        OR: [
          { estadoProduccion: estadoProduccionNoAplica },
          { estado: { not: "ACEPTADO" } },
        ],
      },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_PAGO_50" },
    }),
    prisma.cliente.count({
      where: {
        estado: "ACEPTADO",
        estadoProduccion: "PENDIENTE_PEDIR_MATERIALES",
      },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_FABRICAR" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "EN_FABRICACION" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "PENDIENTE_INSTALACION" },
    }),
    prisma.cliente.count({
      where: { estado: "ACEPTADO", estadoProduccion: "FINALIZADO" },
    }),
    prisma.cliente.findMany({
      select: {
        presupuestos: {
          select: {
            totalConIva: true,
          },
        },
      },
    }),
    prisma.cliente.aggregate({ _sum: { importeAceptado: true } }),
    prisma.cliente.groupBy({
      by: ["motivoRechazo"],
      where: {
        estado: "PERDIDO",
        motivoRechazo: {
          not: null,
        },
      },
      _count: { _all: true },
      orderBy: { _count: { motivoRechazo: "desc" } },
    }),
    prisma.cliente.findMany({
      where: {
        estado: "PERDIDO",
        motivoRechazo: {
          not: null,
        },
      },
      orderBy: { fechaAlta: "desc" },
      select: {
        id: true,
        motivoRechazo: true,
      },
    }),
  ]);
  const totalPresupuestado = clientesParaTotales.reduce(
    (total, cliente) =>
      total +
      cliente.presupuestos.reduce(
        (clienteTotal, presupuesto) =>
          clienteTotal + Number(presupuesto.totalConIva),
        0,
      ),
    0,
  );

  const perdidosPorMotivoConDestino = perdidosPorMotivo.map((item) => {
    const clientesDelMotivo = clientesPerdidosPorMotivo.filter((cliente) => {
      return cliente.motivoRechazo === item.motivoRechazo;
    });
    const clienteUnico = clientesDelMotivo.length === 1 ? clientesDelMotivo[0] : null;

    return {
      ...item,
      clienteIdUnico: clienteUnico?.id ?? null,
    };
  });

  return {
    pendienteDarPrecio,
    citaPendiente,
    pendienteRespuesta,
    aceptados,
    perdidos,
    noAplica,
    pendientePago50,
    pendientePedirMateriales,
    pendienteFabricar,
    enFabricacion,
    pendienteInstalacion,
    finalizados,
    totalPresupuestado,
    importeAceptadoTotal: importeAceptadoTotal._sum.importeAceptado,
    perdidosPorMotivo: perdidosPorMotivoConDestino,
  };
}

type Cliente = Awaited<ReturnType<typeof getClientes>>[number];
type ClienteFormDefaults = {
  nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  origenContacto?: string | null;
  tipoCliente?: string | null;
  presupuesto?: string | null;
  importeAceptado?: string | null;
  fechaAlta?: Date | null;
  fechaSeguimiento?: Date | null;
  fechaMedicion?: Date | null;
  fechaInstalacion?: Date | null;
  estado?: string | null;
  estadoProduccion?: string | null;
  motivoRechazo?: string | null;
  observaciones?: string | null;
};
type SeguimientoPendiente = Awaited<
  ReturnType<typeof getSeguimientosPendientes>
>[number];
type SeguimientoFuturo = Awaited<ReturnType<typeof getSeguimientosFuturos>>[number];
type Resumen = Awaited<ReturnType<typeof getResumen>>;

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
      />
    </label>
  );
}

function EstadoSelect({
  defaultEstadoComercial,
  defaultEstadoProduccion,
  defaultMotivoRechazo,
}: {
  defaultEstadoComercial?: string | null;
  defaultEstadoProduccion?: string | null;
  defaultMotivoRechazo?: string | null;
}) {
  const currentComercial = isEstadoComercial(defaultEstadoComercial)
    ? defaultEstadoComercial
    : estadosComerciales[0];
  const currentProduccion = isEstadoProduccion(defaultEstadoProduccion)
    ? estadoProduccionForComercial(currentComercial, defaultEstadoProduccion)
    : estadoProduccionForComercial(currentComercial);

  return (
    <ClienteEstadoFields
      estadosComerciales={estadosComerciales}
      estadosProduccion={estadosProduccion}
      motivosRechazo={motivosRechazo}
      defaultEstadoComercial={currentComercial}
      defaultEstadoProduccion={currentProduccion}
      defaultMotivoRechazo={defaultMotivoRechazo}
    />
  );
}

function OptionSelect<const T extends readonly string[]>({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: T;
  defaultValue?: string | null;
}) {
  const current = options.includes(defaultValue ?? "")
    ? (defaultValue as T[number])
    : options[0];

  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} name={name} defaultValue={current}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClienteForm({
  action,
  cliente,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  cliente?: Cliente;
  defaults?: ClienteFormDefaults;
  submitLabel: string;
}) {
  const values = cliente ?? defaults;

  return (
    <form action={action} className="grid gap-4">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field
          label="Nombre"
          name="nombre"
          defaultValue={values?.nombre}
          required
        />
        <Field
          label="Telefono"
          name="telefono"
          type="tel"
          defaultValue={values?.telefono}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={values?.email}
        />
        <Field
          label="Direccion"
          name="direccion"
          defaultValue={values?.direccion}
        />
        <LocalidadField
          localidades={localidades}
          defaultValue={values?.localidad}
        />
        <OptionSelect
          label="Origen del contacto"
          name="origenContacto"
          options={origenesContacto}
          defaultValue={values?.origenContacto}
        />
        <OptionSelect
          label="Tipo de cliente"
          name="tipoCliente"
          options={tiposCliente}
          defaultValue={
            cliente ? cliente.tipoCliente ?? cliente.tipoTrabajo : values?.tipoCliente
          }
        />
        <Field
          label="Presupuesto (€)"
          name="presupuesto"
          type="number"
          step="0.01"
          defaultValue={cliente ? cliente.presupuesto?.toString() : defaults?.presupuesto}
        />
        <Field
          label="Importe aceptado (€)"
          name="importeAceptado"
          type="number"
          step="0.01"
          defaultValue={
            cliente ? cliente.importeAceptado?.toString() : defaults?.importeAceptado
          }
        />
        <Field
          label="Fecha de alta"
          name="fechaAlta"
          type="date"
          defaultValue={toDateInputValue(values?.fechaAlta)}
        />
        <Field
          label="Fecha de seguimiento"
          name="fechaSeguimiento"
          type="date"
          defaultValue={toDateInputValue(values?.fechaSeguimiento)}
        />
        <Field
          label="Fecha de medición"
          name="fechaMedicion"
          type="date"
          defaultValue={toDateInputValue(values?.fechaMedicion)}
        />
        <Field
          label="Fecha de instalación"
          name="fechaInstalacion"
          type="date"
          defaultValue={toDateInputValue(values?.fechaInstalacion)}
        />
        <EstadoSelect
          defaultEstadoComercial={values?.estado}
          defaultEstadoProduccion={values?.estadoProduccion}
          defaultMotivoRechazo={values?.motivoRechazo}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Observaciones</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="observaciones"
          defaultValue={values?.observaciones ?? ""}
        />
      </label>
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function toDateInputValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: unknown) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

function displayTipoCliente(cliente: Pick<Cliente, "tipoCliente" | "tipoTrabajo">) {
  return cliente.tipoCliente || cliente.tipoTrabajo || "-";
}

function displayEstadoProduccion(
  cliente: Pick<Cliente, "estado" | "estadoProduccion">,
) {
  return estadoProduccionForComercial(cliente.estado, cliente.estadoProduccion);
}

function estadoComercialClass(estado: string) {
  return (
    estadoComercialStyles[estado as EstadoComercial] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function estadoProduccionClass(estado: string) {
  return (
    estadoProduccionStyles[estado as EstadoProduccion] ??
    "bg-neutral-100 text-neutral-800 ring-neutral-200"
  );
}

function EstadoBadge({
  estado,
  tipo,
}: {
  estado: string;
  tipo: "comercial" | "produccion";
}) {
  const className =
    tipo === "comercial"
      ? estadoComercialClass(estado)
      : estadoProduccionClass(estado);
  const label =
    tipo === "comercial"
      ? estadoComercialLabel(estado)
      : estadoProduccionLabel(estado);

  return (
    <span
      className={`inline-flex min-w-28 max-w-40 items-center justify-center whitespace-normal break-words rounded-full px-2.5 py-1 text-center text-xs font-semibold leading-tight ring-1 ${className}`}
    >
      {label}
    </span>
  );
}

function isVencido(date?: Date | null) {
  return Boolean(date && date < startOfToday());
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-neutral-950">
        {hasFilters ? "No hay clientes con esos filtros" : "Todavia no hay clientes"}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {hasFilters
          ? "Prueba con otra busqueda o cambia los estados seleccionados."
          : "Crea el primer registro desde el formulario superior."}
      </p>
    </div>
  );
}

function SeguimientosPendientes({
  clientes,
}: {
  clientes: SeguimientoPendiente[];
}) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Seguimientos pendientes
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Clientes con seguimiento para hoy o ya vencido.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {clientes.length} pendientes
        </span>
      </div>

      {clientes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Seguimiento</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {clientes.map((cliente) => {
                const vencido = isVencido(cliente.fechaSeguimiento);

                return (
                  <tr
                    key={cliente.id}
                    className={vencido ? "bg-rose-50 align-top" : "align-top"}
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                      >
                        {cliente.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-neutral-700">
                      <PhoneContactActions telefono={cliente.telefono} />
                    </td>
                    <td className="px-4 py-4">
                      <EstadoBadge estado={cliente.estado} tipo="comercial" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={
                          vencido
                            ? "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 ring-1 ring-rose-200"
                            : "text-neutral-700"
                        }
                      >
                        {formatDate(cliente.fechaSeguimiento)}
                        {vencido ? " - Urgente" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                      >
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-neutral-500">
          No hay seguimientos pendientes para hoy.
        </p>
      )}
    </section>
  );
}

function SeguimientosFuturos({ clientes }: { clientes: SeguimientoFuturo[] }) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Seguimientos futuros
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Proximas llamadas, visitas o revisiones comerciales.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {clientes.length} futuros
        </span>
      </div>

      {clientes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Seguimiento</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                    >
                      {cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    <PhoneContactActions telefono={cliente.telefono} />
                  </td>
                  <td className="px-4 py-4">
                    <EstadoBadge estado={cliente.estado} tipo="comercial" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                    {formatDate(cliente.fechaSeguimiento)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-neutral-500">
          No hay seguimientos futuros programados.
        </p>
      )}
    </section>
  );
}

function ResumenComercial({ resumen }: { resumen: Resumen }) {
  const comerciales = [
    ["Pendiente dar precio", resumen.pendienteDarPrecio],
    ["Cita pendiente", resumen.citaPendiente],
    ["Pendiente respuesta", resumen.pendienteRespuesta],
    ["Aceptados", resumen.aceptados],
    ["Perdidos", resumen.perdidos],
  ] as const;
  const produccion = [
    ["No aplica", resumen.noAplica],
    ["Pago 50%", resumen.pendientePago50],
    ["Pedir materiales", resumen.pendientePedirMateriales],
    ["Empezar a fabricar", resumen.pendienteFabricar],
    ["En fabricacion", resumen.enFabricacion],
    ["Instalacion", resumen.pendienteInstalacion],
    ["Finalizados", resumen.finalizados],
  ] as const;
  const negocio = [
    ["Total presupuestado", formatCurrency(resumen.totalPresupuestado)],
    ["Importe aceptado", formatCurrency(resumen.importeAceptadoTotal)],
  ] as const;

  return (
    <section className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {comerciales.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {produccion.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {negocio.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Clientes perdidos por motivo
          </h2>
          <span className="text-sm font-semibold text-neutral-700">
            {resumen.perdidosPorMotivo.reduce(
              (total, item) => total + item._count._all,
              0,
            )}{" "}
            perdidos
          </span>
        </div>
        {resumen.perdidosPorMotivo.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {resumen.perdidosPorMotivo.map((item) => {
              const motivo = item.motivoRechazo ?? "Sin motivo";
              const href = item.clienteIdUnico
                ? `/clientes/${item.clienteIdUnico}`
                : `/clientes/perdidos?motivo=${encodeURIComponent(
                    motivoRechazoToParam(motivo),
                  )}`;

              return (
                <Link
                  key={motivo}
                  href={href}
                  className="group cursor-pointer rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <p className="text-sm font-semibold text-neutral-950 transition group-hover:text-emerald-900">
                    {motivo}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500 transition group-hover:text-emerald-800">
                    {item._count._all} clientes
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Todavia no hay clientes perdidos.
          </p>
        )}
      </div>
    </section>
  );
}

function SearchForm({
  query,
  estadoComercial,
  estadoProduccion,
}: {
  query: string;
  estadoComercial: EstadoComercial | null;
  estadoProduccion: EstadoProduccion | null;
}) {
  return (
    <form action="/clientes" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_240px_auto]">
      <input
        className={inputClass}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar por nombre o telefono"
      />
      <select
        className={inputClass}
        name="estadoComercial"
        defaultValue={estadoComercial ?? ""}
      >
        <option value="">Estado comercial</option>
        {estadosComerciales.map((estado) => (
          <option key={estado} value={estado}>
            {estadoComercialLabel(estado)}
          </option>
        ))}
      </select>
      <select
        className={inputClass}
        name="estadoProduccion"
        defaultValue={estadoProduccion ?? ""}
      >
        <option value="">Estado producción</option>
        {estadosProduccion.map((estado) => (
          <option key={estado} value={estado}>
            {estadoProduccionLabel(estado)}
          </option>
        ))}
      </select>
      <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Buscar
        </button>
        {query || estadoComercial || estadoProduccion ? (
          <Link
            href="/clientes"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function successFromParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1";
}

function ClienteEliminadoMessage() {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-sm">
      Cliente eliminado correctamente.
    </div>
  );
}

function ClienteDetails({ cliente }: { cliente: Cliente }) {
  return (
    <dl className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
      <div>
        <dt className="font-medium text-neutral-500">Telefono</dt>
        <dd>
          <PhoneContactActions telefono={cliente.telefono} />
        </dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Presupuesto</dt>
        <dd>{formatCurrency(cliente.presupuesto)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Aceptado</dt>
        <dd>{formatCurrency(cliente.importeAceptado)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Alta</dt>
        <dd>{formatDate(cliente.fechaAlta)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Seguimiento</dt>
        <dd>{formatDate(cliente.fechaSeguimiento)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Medición</dt>
        <dd>{formatDate(cliente.fechaMedicion)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Instalación</dt>
        <dd>{formatDate(cliente.fechaInstalacion)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Origen</dt>
        <dd>{cliente.origenContacto || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Tipo cliente</dt>
        <dd>{displayTipoCliente(cliente)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Localidad</dt>
        <dd>{cliente.localidad || "-"}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Estado comercial</dt>
        <dd>{estadoComercialLabel(cliente.estado)}</dd>
      </div>
      <div>
        <dt className="font-medium text-neutral-500">Estado producción</dt>
        <dd>{estadoProduccionLabel(displayEstadoProduccion(cliente))}</dd>
      </div>
      {cliente.estado === "PERDIDO" ? (
        <div className="sm:col-span-2">
          <dt className="font-medium text-neutral-500">Motivo rechazo</dt>
          <dd>{cliente.motivoRechazo || "-"}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-neutral-300 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <tr>
            <th className="px-4 py-3">Alta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Telefono</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Tipo cliente</th>
            <th className="px-4 py-3">Localidad</th>
            <th className="px-4 py-3">Presupuesto</th>
            <th className="px-4 py-3">Aceptado</th>
            <th className="px-4 py-3">Seguimiento</th>
            <th className="px-4 py-3">Medición</th>
            <th className="px-4 py-3">Instalación</th>
            <th className="min-w-36 px-4 py-3 text-center">Comercial</th>
            <th className="min-w-40 px-4 py-3 text-center">Producción</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaAlta)}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/clientes/${cliente.id}`}
                  className="font-semibold text-neutral-950 transition hover:text-emerald-800"
                >
                  {cliente.nombre}
                </Link>
              </td>
              <td className="px-4 py-4 text-neutral-700">
                <PhoneContactActions telefono={cliente.telefono} />
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.origenContacto || "-"}
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {displayTipoCliente(cliente)}
              </td>
              <td className="px-4 py-4 text-neutral-700">
                {cliente.localidad || "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                {formatCurrency(cliente.presupuesto)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-neutral-950">
                {formatCurrency(cliente.importeAceptado)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaSeguimiento)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaMedicion)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-neutral-700">
                {formatDate(cliente.fechaInstalacion)}
              </td>
              <td className="min-w-36 px-4 py-4 text-center">
                <EstadoBadge estado={cliente.estado} tipo="comercial" />
                {cliente.estado === "PERDIDO" && cliente.motivoRechazo ? (
                  <p className="mt-2 text-xs font-medium text-rose-700">
                    {cliente.motivoRechazo}
                  </p>
                ) : null}
              </td>
              <td className="min-w-40 px-4 py-4 text-center">
                <EstadoBadge
                  estado={displayEstadoProduccion(cliente)}
                  tipo="produccion"
                />
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/clientes/${cliente.id}#editar-cliente`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                  >
                    Editar
                  </Link>
                  <DeleteClienteForm clienteId={cliente.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientesCards({ clientes }: { clientes: Cliente[] }) {
  return (
    <div className="grid gap-4 lg:hidden">
      {clientes.map((cliente) => (
        <article
          key={cliente.id}
          className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/clientes/${cliente.id}`}
                className="text-lg font-semibold text-neutral-950 transition hover:text-emerald-800"
              >
                {cliente.nombre}
              </Link>
              <p className="mt-1 text-sm text-neutral-500">
                Alta: {formatDate(cliente.fechaAlta)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <EstadoBadge estado={cliente.estado} tipo="comercial" />
              <EstadoBadge
                estado={displayEstadoProduccion(cliente)}
                tipo="produccion"
              />
            </div>
          </div>
          <div className="mt-4">
            <ClienteDetails cliente={cliente} />
          </div>
          {cliente.observaciones ? (
            <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-700">
              {cliente.observaciones}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/clientes/${cliente.id}#editar-cliente`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Editar
            </Link>
            <DeleteClienteForm clienteId={cliente.id} />
          </div>
        </article>
      ))}
    </div>
  );
}

type ClientesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    clienteEliminado?: string | string[];
    nombre?: string | string[];
    telefono?: string | string[];
    email?: string | string[];
    origenContacto?: string | string[];
    observaciones?: string | string[];
    estadoComercial?: string | string[];
    estadoProduccion?: string | string[];
  }>;
};

function searchParamString(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clienteDefaultsFromParams(
  params: Awaited<ClientesPageProps["searchParams"]>,
): ClienteFormDefaults | undefined {
  const nombre = searchParamString(params.nombre)?.trim();
  const telefono = searchParamString(params.telefono)?.trim();
  const email = searchParamString(params.email)?.trim();
  const origenContacto = searchParamString(params.origenContacto)?.trim();
  const observaciones = searchParamString(params.observaciones)?.trim();

  if (!nombre && !telefono && !email && !observaciones) {
    return undefined;
  }

  return {
    nombre,
    telefono,
    email,
    origenContacto,
    observaciones,
  };
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  await connection();

  const params = await searchParams;
  const queryParam = searchParamString(params.q);
  const query = queryParam?.trim() ?? "";
  const estadoComercialParam = searchParamString(params.estadoComercial)?.trim();
  const estadoProduccionParam = searchParamString(params.estadoProduccion)?.trim();
  const estadoComercial = isEstadoComercial(estadoComercialParam)
    ? estadoComercialParam
    : null;
  const estadoProduccion = isEstadoProduccion(estadoProduccionParam)
    ? estadoProduccionParam
    : null;
  const clienteDefaults = clienteDefaultsFromParams(params);
  const [clientes, seguimientosPendientes, seguimientosFuturos, resumen] =
    await Promise.all([
      getClientes(query, estadoComercial, estadoProduccion),
      getSeguimientosPendientes(),
      getSeguimientosFuturos(),
      getResumen(),
    ]);

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver al panel
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Gestor comercial Carpinteria Juanser
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {clientes.length} registros visibles ordenados por fecha de alta
            </p>
          </div>
          <Link
            href="/presupuestos"
            className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ver presupuestos
          </Link>
        </header>

        {successFromParam(params.clienteEliminado) ? (
          <ClienteEliminadoMessage />
        ) : null}

        <ResumenComercial resumen={resumen} />

        <SeguimientosPendientes clientes={seguimientosPendientes} />

        <SeguimientosFuturos clientes={seguimientosFuturos} />

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nuevo cliente
            </h2>
          </div>
          <ClienteForm
            action={createCliente}
            defaults={clienteDefaults}
            submitLabel="Crear cliente"
          />
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_minmax(320px,520px)] md:items-end">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Listado</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Tabla por fecha, estado comercial, producción y seguimiento.
              </p>
            </div>
            <SearchForm
              query={query}
              estadoComercial={estadoComercial}
              estadoProduccion={estadoProduccion}
            />
          </div>
          {clientes.length > 0 ? (
            <>
              <ClientesTable clientes={clientes} />
              <ClientesCards clientes={clientes} />
            </>
          ) : (
            <EmptyState
              hasFilters={Boolean(query || estadoComercial || estadoProduccion)}
            />
          )}
        </section>
      </div>
    </main>
  );
}
