"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { isValidSessionValue, sessionCookieName } from "@/app/lib/auth";
import {
  generatePresupuestoNumero,
  presupuestoNumeroLockKey,
} from "@/app/lib/presupuesto-numero";
import type { AnalisisSolicitudIA, AsistenteActionResult } from "./types";

type ActionPayload = {
  analisis: AnalisisSolicitudIA;
  textoOriginal: string;
  clienteId?: number;
};

const clean = (value?: string) => value?.trim() || null;
const normalizedPhone = (value?: string | null) => value?.replace(/\D/g, "") ?? "";

function validPayload(payload: ActionPayload) {
  if (!payload || typeof payload !== "object" || !payload.analisis) {
    throw new Error("El análisis no es válido.");
  }
  return payload;
}

async function findClienteByPhone(telefono?: string) {
  const normalized = normalizedPhone(telefono);
  if (!normalized) return null;
  const clientes = await prisma.cliente.findMany({
    where: { telefono: { not: null } },
    select: { id: true, telefono: true },
  });
  return clientes.find((item) => normalizedPhone(item.telefono) === normalized) ?? null;
}

async function ensureCliente(payload: ActionPayload) {
  const cookieStore = await cookies();
  if (!isValidSessionValue(cookieStore.get(sessionCookieName)?.value)) {
    throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
  }

  if (payload.clienteId) {
    const selected = await prisma.cliente.findUnique({
      where: { id: payload.clienteId },
      select: { id: true },
    });
    if (selected) return { id: selected.id, created: false };
  }
  const existing = await findClienteByPhone(payload.analisis.telefono);
  if (existing) return { id: existing.id, created: false };

  const { analisis } = payload;
  const cliente = await prisma.cliente.create({
    data: {
      nombre: clean(analisis.nombre) ?? "Contacto pendiente de identificar",
      telefono: clean(analisis.telefono),
      email: clean(analisis.email),
      direccion: clean(analisis.direccion),
      localidad: clean(analisis.localidad),
      tipoTrabajo: clean(analisis.tipoTrabajo),
      origenContacto: "Otro",
      estado: analisis.solicitaCita ? "CITA_PENDIENTE" : "PENDIENTE_DAR_PRECIO",
      estadoProduccion: "NO_APLICA",
      observaciones: clean(analisis.resumenInterno),
    },
  });
  await registrarActividadCliente({
    clienteId: cliente.id,
    tipo: "CLIENTE_CREADO",
    descripcion: "Cliente creado desde Asistente IA",
    usuario: process.env.CRM_USER ?? null,
  });
  return { id: cliente.id, created: true };
}

function failed(error: unknown, fallback: string): AsistenteActionResult {
  return { ok: false, message: error instanceof Error ? error.message : fallback };
}

export async function crearContactoDesdeAsistente(input: ActionPayload) {
  try {
    const cliente = await ensureCliente(validPayload(input));
    revalidatePath("/");
    revalidatePath("/clientes");
    return {
      ok: true,
      clienteId: cliente.id,
      href: `/clientes/${cliente.id}`,
      message: cliente.created
        ? "Contacto creado. Abriendo su ficha…"
        : "El contacto ya existía. Abriendo su ficha…",
    } satisfies AsistenteActionResult;
  } catch (error) {
    return failed(error, "No se pudo crear el contacto.");
  }
}

export async function crearSeguimientoDesdeAsistente(input: ActionPayload) {
  try {
    const payload = validPayload(input);
    const cliente = await ensureCliente(payload);
    const usuario = process.env.CRM_USER?.trim() || "Usuario CRM";
    const nota = [
      "Seguimiento creado por Asistente IA",
      `Usuario: ${usuario}`,
      "",
      "Resumen IA:",
      payload.analisis.resumenInterno || "Sin resumen.",
      "",
      "Texto original:",
      payload.textoOriginal.trim() || "Solicitud recibida únicamente como archivo.",
    ].join("\n");
    await prisma.seguimiento.create({ data: { clienteId: cliente.id, nota } });
    await registrarActividadCliente({
      clienteId: cliente.id,
      tipo: "SEGUIMIENTO_CREADO",
      descripcion: "Seguimiento añadido desde Asistente IA",
      usuario,
    });
    revalidatePath(`/clientes/${cliente.id}`);
    revalidatePath("/clientes");
    return {
      ok: true,
      clienteId: cliente.id,
      href: `/clientes/${cliente.id}`,
      message: "Seguimiento guardado correctamente.",
    } satisfies AsistenteActionResult;
  } catch (error) {
    return failed(error, "No se pudo crear el seguimiento.");
  }
}

export async function crearCitaDesdeAsistente(input: ActionPayload) {
  try {
    const payload = validPayload(input);
    if (!payload.analisis.fechaHora) {
      return { ok: false, message: "No se ha detectado fecha y hora para crear la cita." };
    }
    const fechaHora = new Date(payload.analisis.fechaHora);
    if (Number.isNaN(fechaHora.getTime())) {
      return { ok: false, message: "La fecha y hora detectadas no son válidas." };
    }
    const cliente = await ensureCliente(payload);
    const cita = await prisma.cita.create({
      data: {
        clienteNombre: clean(payload.analisis.nombre) ?? "Contacto pendiente de identificar",
        telefono: clean(payload.analisis.telefono),
        email: clean(payload.analisis.email),
        fechaHora,
        origen: "MANUAL",
        estado: "PENDIENTE",
        nota: ["Cita creada desde Asistente IA.", payload.analisis.tipoTrabajo, payload.analisis.resumenInterno]
          .filter(Boolean)
          .join("\n"),
      },
    });
    revalidatePath("/");
    revalidatePath("/citas");
    return {
      ok: true,
      clienteId: cliente.id,
      href: `/citas?cita=${cita.id}`,
      message: "Cita pendiente creada correctamente.",
    } satisfies AsistenteActionResult;
  } catch (error) {
    return failed(error, "No se pudo crear la cita.");
  }
}

export async function crearPresupuestoDesdeAsistente(input: ActionPayload) {
  try {
    const payload = validPayload(input);
    const cliente = await ensureCliente(payload);
    const fecha = new Date();
    const presupuesto = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${presupuestoNumeroLockKey})`;
      const numero = await generatePresupuestoNumero(fecha, tx);
      const titulo = clean(payload.analisis.tipoTrabajo) ?? "Trabajo por definir";
      return tx.presupuesto.create({
        data: {
          clienteId: cliente.id,
          numero,
          titulo,
          descripcion: clean(payload.analisis.resumenInterno) ?? titulo,
          importe: "0",
          estado: "PENDIENTE",
          fecha,
          validezDias: 30,
          observaciones: "Borrador creado por Asistente IA. Revisar antes de enviar.",
          ivaPorcentaje: "21",
          totalSinIva: "0",
          totalIva: "0",
          totalConIva: "0",
          lineas: {
            create: {
              concepto: titulo,
              descripcion:
                [payload.analisis.medidas, payload.analisis.materiales]
                  .filter(Boolean)
                  .join(" · ") || null,
              cantidad: "1",
              precioUnitario: "0",
              total: "0",
            },
          },
        },
      });
    });
    await registrarActividadCliente({
      clienteId: cliente.id,
      tipo: "PRESUPUESTO_CREADO",
      descripcion: `Presupuesto borrador nº ${presupuesto.numero} creado desde Asistente IA`,
      usuario: process.env.CRM_USER ?? null,
    });
    revalidatePath(`/clientes/${cliente.id}`);
    revalidatePath("/presupuestos");
    return {
      ok: true,
      clienteId: cliente.id,
      href: `/presupuestos/${presupuesto.id}/editar`,
      message: "Presupuesto borrador creado. Ya puedes completar importes y partidas.",
    } satisfies AsistenteActionResult;
  } catch (error) {
    return failed(error, "No se pudo crear el presupuesto borrador.");
  }
}
