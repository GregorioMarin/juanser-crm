export function parseDecimalEs(value: string | number | null | undefined, scale = 2) {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const withoutSpaces = raw.replace(/\s/g, "").replace(/%$/, "");
  const hasComma = withoutSpaces.includes(",");
  const hasDot = withoutSpaces.includes(".");
  const normalized = hasComma
    ? withoutSpaces.replace(/\./g, "").replace(",", ".")
    : hasDot
      ? withoutSpaces
      : withoutSpaces;

  const decimalPattern = new RegExp(`^-?\\d+(\\.\\d{1,${scale}})?$`);
  if (!decimalPattern.test(normalized)) {
    return null;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number.toFixed(scale) : null;
}

export function parseDecimalEsNumber(
  value: string | number | null | undefined,
  scale = 2,
) {
  const parsed = parseDecimalEs(value, scale);
  return parsed === null ? null : Number(parsed);
}

export function formatDecimalEs(
  value: { toString(): string } | string | number | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = minimumFractionDigits,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value.toString());
  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number);
}

export function formatCurrencyEs(value: { toString(): string } | string | number | null | undefined) {
  const number = value === null || value === undefined ? 0 : Number(value.toString());

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(number) ? number : 0);
}
