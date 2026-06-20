import "server-only";

import { prisma } from "@/app/lib/prisma";
import { extractOpenAIText } from "@/app/lib/openai-response";
import { defaultPresupuestoObservaciones } from "@/app/presupuestos/default-observaciones";
import type { ChatRequestMessage } from "./chat-types";

function compact(value: string | null, maxLength: number) {
  return value?.trim().slice(0, maxLength) || null;
}

async function manualContext() {
  const articulos = await prisma.manualArticulo.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { titulo: "asc" }],
    take: 6,
    select: {
      titulo: true,
      categoria: true,
      resumen: true,
      contenido: true,
      usoComercial: true,
      notaInterna: true,
    },
  });

  if (articulos.length === 0) {
    return "No hay artículos activos en el manual técnico-comercial.";
  }

  return articulos
    .map((articulo) =>
      [
        `### ${articulo.titulo} (${articulo.categoria})`,
        compact(articulo.resumen, 600),
        compact(articulo.usoComercial, 1_000),
        compact(articulo.notaInterna, 800),
        compact(articulo.contenido, 1_500),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

export async function responderChatJuanser(messages: ChatRequestMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const internalManual = await manualContext();
  const condicionesSinCuenta = defaultPresupuestoObservaciones.split("Nº Cuenta:")[0].trim();
  const instructions = `Eres el asistente interno de Carpintería Juanser. Ayudas al equipo del CRM, no hablas directamente con el cliente salvo cuando te pidan redactar un mensaje para él.

Tus tareas principales son redactar respuestas breves y naturales para WhatsApp, resumir solicitudes, preparar notas de seguimiento, organizar datos para presupuestos y orientar sobre los criterios comerciales disponibles.

Reglas obligatorias:
- No inventes precios, medidas, materiales, plazos, citas ni datos del cliente.
- Si falta información para valorar un trabajo, enumera exactamente qué debe pedirse.
- Puedes explicar criterios internos al usuario del CRM, pero cualquier texto destinado al cliente debe omitir cálculos, márgenes, costes, reglas internas y razonamientos de precio.
- No presentes una orientación como presupuesto cerrado. Los importes deben proceder siempre de datos confirmados por Juanser.
- Distingue con claridad entre hechos aportados, inferencias y datos pendientes.
- Responde en español, con tono profesional, práctico y conciso.
- Cuando redactes WhatsApp para un cliente, usa un tono amable, natural y algún emoticono sin excederte.

Condiciones estándar de presupuesto existentes en el CRM (uso interno; no incluyas datos bancarios salvo petición explícita del usuario):
${condicionesSinCuenta}

Extractos activos del manual técnico-comercial interno:
${internalManual}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ASISTENTE_MODEL ?? "gpt-4.1-mini",
      instructions,
      input: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI assistant chat failed", response.status, detail);
    throw new Error("OpenAI no pudo responder en este momento. Inténtalo de nuevo.");
  }

  const output = extractOpenAIText(await response.json());
  if (!output) throw new Error("La IA no devolvió una respuesta legible.");
  return output;
}
