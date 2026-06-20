import { cookies } from "next/headers";
import { responderChatJuanser } from "@/app/asistente/chat";
import type { ChatRequestMessage } from "@/app/asistente/chat-types";
import { isValidSessionValue, sessionCookieName } from "@/app/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxMessages = 30;
const maxMessageLength = 10_000;
const maxConversationLength = 40_000;

function validMessages(value: unknown): value is ChatRequestMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= maxMessages &&
    value.every(
      (message) =>
        message &&
        typeof message === "object" &&
        "role" in message &&
        (message.role === "user" || message.role === "assistant") &&
        "content" in message &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        message.content.length <= maxMessageLength,
    )
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidSessionValue(cookieStore.get(sessionCookieName)?.value)) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { messages?: unknown };
    if (!validMessages(body.messages)) {
      return Response.json(
        { error: "La conversación está vacía o contiene mensajes no válidos." },
        { status: 400 },
      );
    }
    const totalLength = body.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
    if (totalLength > maxConversationLength) {
      return Response.json(
        { error: "La conversación es demasiado larga. Inicia una nueva conversación." },
        { status: 400 },
      );
    }

    return Response.json({ message: await responderChatJuanser(body.messages) });
  } catch (error) {
    console.error("Assistant chat request failed", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener una respuesta de la IA.",
      },
      { status: 500 },
    );
  }
}

