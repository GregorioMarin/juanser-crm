import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const fallbackNota = "Payload Amelia pendiente de mapear";

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

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return ["auth", "cookie", "password", "passwd", "secret", "token", "apikey", "api_key"].some(
    (pattern) => normalizedKey.includes(pattern),
  );
}

function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (!isObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : sanitizeForLog(entry),
    ]),
  );
}

function basicHeaders(headers: Headers) {
  return {
    "content-type": headers.get("content-type"),
    "user-agent": headers.get("user-agent"),
    "x-forwarded-for": headers.get("x-forwarded-for"),
    "x-real-ip": headers.get("x-real-ip"),
  };
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
  let parseError = false;
  const rawBody = await request.text();

  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
    parseError = true;
  }

  const nombre = clienteNombre(payload);
  const date = fechaHora(payload);
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
  const payloadMapped = Boolean(nombre && date && !parseError);

  console.info("[Amelia webhook] POST recibido", {
    headers: basicHeaders(request.headers),
    body: parseError
      ? { parseError: "Body no es JSON valido", sizeBytes: rawBody.length }
      : sanitizeForLog(payload),
    ameliaBookingId,
    clienteNombre: nombre,
    fechaHora: date?.toISOString() ?? null,
  });

  const data = {
    clienteNombre: nombre ?? "Amelia pendiente de mapear",
    telefono:
      findFirstString(customer, ["telefono", "phone", "customerPhone"]) ??
      findFirstString(payload, ["telefono", "phone", "customerPhone"]),
    email:
      findFirstString(customer, ["email", "customerEmail"]) ??
      findFirstString(payload, ["email", "customerEmail"]),
    fechaHora: date ?? new Date(),
    origen: "AMELIA" as const,
    estado: payloadMapped ? estado(payload) : ("PENDIENTE" as const),
    nota: payloadMapped ? nota(payload) : fallbackNota,
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
