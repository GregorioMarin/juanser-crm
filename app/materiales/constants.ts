export const categoriasMaterial = [
  "Tableros",
  "Cantos",
  "Herrajes",
  "Barnices / pinturas",
  "Ferretería",
  "Herramientas / maquinaria",
  "Otros",
] as const;

export const unidadesMaterial = [
  "ud",
  "m",
  "m2",
  "ml",
  "kg",
  "l",
  "pack",
] as const;

export function prefijoCategoriaMaterial(categoria?: string | null) {
  switch (categoria) {
    case "Tableros":
      return "TAB";
    case "Cantos":
      return "CAN";
    case "Herrajes":
      return "HER";
    case "Barnices / pinturas":
      return "BAR";
    case "Ferretería":
      return "FER";
    case "Herramientas / maquinaria":
      return "HER-MAQ";
    default:
      return "OTR";
  }
}
