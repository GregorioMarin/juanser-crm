export const motivosRechazo = [
  "Muy caro",
  "Lo hace otro carpintero",
  "Lo deja para más adelante",
  "No responde",
  "Fuera de localidad",
  "Trabajo que no realizamos",
  "Otro",
] as const;

export function motivoRechazoToParam(motivo: string) {
  return motivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function motivoRechazoFromParam(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = motivoRechazoToParam(value);
  return (
    motivosRechazo.find((motivo) => {
      return motivoRechazoToParam(motivo) === normalizedValue;
    }) ?? null
  );
}
