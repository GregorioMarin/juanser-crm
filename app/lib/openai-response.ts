import "server-only";

function collectTextValues(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (
    "type" in value &&
    value.type === "output_text" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return [value.text];
  }
  if (Array.isArray(value)) return value.flatMap(collectTextValues);
  return Object.values(value).flatMap(collectTextValues);
}

export function extractOpenAIText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as Record<string, unknown> & { output_text?: unknown };
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  return collectTextValues(response).find((value) => value.trim())?.trim() ?? null;
}

