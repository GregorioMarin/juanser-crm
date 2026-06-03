import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const estadoMap: Record<string, "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "REALIZADA"> =
  {
    pending: "PENDIENTE",
    pendiente: "PENDIENTE",
    approved: "CONFIRMADA",
    confirmed: "CONFIRMADA",
    confirmada: "CONFIRMADA",
    canceled: "CANCELADA",
    cancelled: "CANCELADA",
    cancelada: "CANCELADA",
    completed: "REALIZADA",
    realizada: "REALIZADA",
  };

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function findFirstString(source: unknown, keys: string[]): string | null {
  if (!isObject(source)) {
    return null;
  }

  for (const key of keys) {
    const direct = stringValue(source[key]);
    if (direct) {
      return direct;
    }
  }

  for (const value of Object.values(source)) {
    if (isObject(value)) {
      const nested = findFirstString(value, keys);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function findObject(source: unknown, keys: string[]): JsonObject | null {
  if (!isObject(source)) {
    return null;
  }

  for (const key of keys) {
    const direct = source[key];
    if (isObject(direct)) {
      return direct;
    }
  }

  for (const value of Object.values(source)) {
    if (isObject(value)) {
      const nested = findObject(value, keys);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function clienteNombre(payload: unknown) {
  const customer = findObject(payload, ["customer", "cliente", "user"]);
  const directName = findFirstString(payload, [
    "clienteNombre",
    "customerName",
    "customerFullName",
    "fullName",
    "name",
  ]);

  if (directName) {
    return directName;
  }

  const firstName = findFirstString(customer, ["firstName", "first_name", "nombre"]);
  const lastName = findFirstString(customer, ["lastName", "last_name", "apellidos"]);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || null;
}

function fechaHora(payload: unknown) {
  const rawDate = findFirstString(payload, [
    "fechaHora",
    "bookingStart",
    "appointmentStart",
    "start",
    "startsAt",
    "dateTime",
    "datetime",
    "scheduledAt",
  ]);
  const date = rawDate ? new Date(rawDate) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function estado(payload: unknown) {
  const rawEstado = findFirstString(payload, ["estado", "status", "bookingStatus"]);

  if (!rawEstado) {
    return "CONFIRMADA" as const;
  }

  return estadoMap[rawEstado.toLowerCase()] ?? "CONFIRMADA";
}

function nota(payload: unknown) {
  const service = findFirstString(payload, ["serviceName", "service", "servicio"]);
  const note = findFirstString(payload, ["nota", "note", "notes", "description"]);

  return [service ? `Servicio: ${service}` : null, note].filter(Boolean).join("\n") || null;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Payload JSON no valido." }, { status: 400 });
  }

  const nombre = clienteNombre(payload);
  const date = fechaHora(payload);

  if (!nombre || !date) {
    return Response.json(
      { error: "Faltan clienteNombre o fechaHora en el webhook." },
      { status: 400 },
    );
  }

  const ameliaBookingId = findFirstString(payload, [
    "ameliaBookingId",
    "bookingId",
    "booking_id",
    "appointmentId",
    "appointment_id",
  ]) ?? findFirstString(findObject(payload, ["booking", "appointment", "reservation"]), [
    "id",
    "ameliaBookingId",
    "bookingId",
    "booking_id",
    "appointmentId",
    "appointment_id",
  ]);
  const customer = findObject(payload, ["customer", "cliente", "user"]);

  const data = {
    clienteNombre: nombre,
    telefono: findFirstString(customer, [
      "telefono",
      "phone",
      "customerPhone",
    ]) ?? findFirstString(payload, ["telefono", "phone", "customerPhone"]),
    email:
      findFirstString(customer, ["email", "customerEmail"]) ??
      findFirstString(payload, ["email", "customerEmail"]),
    fechaHora: date,
    origen: "AMELIA" as const,
    estado: estado(payload),
    nota: nota(payload),
  };

  const cita = ameliaBookingId
    ? await prisma.cita.upsert({
        where: { ameliaBookingId },
        create: { ...data, ameliaBookingId },
        update: data,
      })
    : await prisma.cita.create({ data });

  revalidatePath("/citas");

  return Response.json({ ok: true, citaId: cita.id });
}
