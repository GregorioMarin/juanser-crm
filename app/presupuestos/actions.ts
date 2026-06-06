"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarActividadCliente } from "@/app/lib/actividad";
import { prisma } from "@/app/lib/prisma";
import { defaultPresupuestoValidezDias } from "./default-observaciones";

function requiredId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Presupuesto no valido.");
  }

  return id;
}

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

function parseDecimal(value: string, key: string) {
  const normalized = value.replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`El campo ${key} debe ser un importe valido.`);
  }

  return normalized;
}

function optionalDecimal(formData: FormData, key: string, fallback = "0") {
  const value = optionalString(formData, key);
  return value ? parseDecimal(value, key) : fallback;
}

function requiredDecimal(formData: FormData, key: string) {
  return parseDecimal(requiredString(formData, key), key);
}

function requiredDate(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La fecha ${key} no es valida.`);
  }

  return date;
}

function optionalInteger(formData: FormData, key: string, fallback: number) {
  const value = optionalString(formData, key);
  if (!value) {
    return fallback;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`El campo ${key} no es valido.`);
  }

  return numberValue;
}

function presupuestoEstado(formData: FormData) {
  const value = optionalString(formData, "estado") ?? "PENDIENTE";
  if (!["PENDIENTE", "ACEPTADO", "RECHAZADO"].includes(value)) {
    throw new Error("Estado de presupuesto no valido.");
  }

  return value as "PENDIENTE" | "ACEPTADO" | "RECHAZADO";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export type PresupuestoCostesState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function costeMaterialesData(formData: FormData) {
  const indexes = formData
    .getAll("costeMaterialIndex")
    .filter((value): value is string => typeof value === "string");

  return indexes
    .map((index) => {
      const materialId = optionalString(formData, `costeMaterial-${index}-materialId`);
      const descripcion = optionalString(
        formData,
        `costeMaterial-${index}-descripcion`,
      );
      const cantidadRaw = optionalString(formData, `costeMaterial-${index}-cantidad`);
      const precioRaw = optionalString(formData, `costeMaterial-${index}-precioCoste`);

      if (!materialId && !descripcion && !cantidadRaw && !precioRaw) {
        return null;
      }

      const cantidad = parseDecimal(cantidadRaw ?? "1", "cantidad material");
      const precioCoste = parseDecimal(precioRaw ?? "0", "precio coste");
      const subtotal = roundCurrency(Number(cantidad) * Number(precioCoste));

      return {
        materialId,
        descripcion: descripcion ?? "Material pendiente",
        cantidad,
        precioCoste,
        subtotal: subtotal.toFixed(2),
      };
    })
    .filter((linea): linea is NonNullable<typeof linea> => linea !== null);
}

function otrosCostesData(formData: FormData) {
  const indexes = formData
    .getAll("otroCosteIndex")
    .filter((value): value is string => typeof value === "string");

  return indexes
    .map((index) => {
      const descripcion = optionalString(formData, `otroCoste-${index}-descripcion`);
      const importeRaw = optionalString(formData, `otroCoste-${index}-importe`);

      if (!descripcion && !importeRaw) {
        return null;
      }

      return {
        descripcion: descripcion ?? "Coste pendiente",
        importe: parseDecimal(importeRaw ?? "0", "importe de otro coste"),
      };
    })
    .filter((linea): linea is NonNullable<typeof linea> => linea !== null);
}

function presupuestoLineasData(formData: FormData) {
  const lineIndexes = Array.from(
    new Set(
      Array.from(formData.keys())
        .map((key) => key.match(/^lineas\[(\d+)\]\[/)?.[1])
        .filter((value): value is string => Boolean(value))
        .map(Number),
    ),
  ).sort((a, b) => a - b);

  const lineas = lineIndexes
    .map((index) => {
      const concepto = optionalString(formData, `lineas[${index}][concepto]`);
      const descripcion = optionalString(
        formData,
        `lineas[${index}][descripcion]`,
      );
      const cantidadRaw = optionalString(
        formData,
        `lineas[${index}][cantidad]`,
      );
      const precioRaw = optionalString(
        formData,
        `lineas[${index}][precioUnitario]`,
      );

      if (!concepto && !descripcion && !cantidadRaw && !precioRaw) {
        return null;
      }

      if (!concepto || !cantidadRaw || !precioRaw) {
        throw new Error("Cada linea debe tener concepto, cantidad y precio.");
      }

      const cantidad = parseDecimal(cantidadRaw, "cantidad");
      const precioUnitario = parseDecimal(precioRaw, "precioUnitario");
      const total = roundCurrency(Number(cantidad) * Number(precioUnitario));

      return {
        concepto,
        descripcion,
        cantidad,
        precioUnitario,
        total: total.toFixed(2),
      };
    })
    .filter(
      (
        linea,
      ): linea is {
        concepto: string;
        descripcion: string | null;
        cantidad: string;
        precioUnitario: string;
        total: string;
      } => linea !== null,
    );

  if (lineas.length === 0) {
    throw new Error("Añade al menos una linea de presupuesto.");
  }

  return lineas;
}

function safeReturnTo(
  formData: FormData,
  fallback: string,
  successParam?: string,
) {
  const value = formData.get("returnTo");
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  const url = new URL(value, "http://localhost");
  if (url.origin !== "http://localhost") {
    return fallback;
  }

  if (successParam) {
    url.searchParams.set(successParam, "1");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export async function deletePresupuesto(formData: FormData) {
  const presupuestoId = requiredId(formData, "presupuestoId");

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: {
      clienteId: true,
      numero: true,
      estado: true,
    },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  await prisma.presupuesto.delete({
    where: { id: presupuestoId },
  });
  await registrarActividadCliente({
    clienteId: presupuesto.clienteId,
    tipo: "PRESUPUESTO_ELIMINADO",
    descripcion: `Presupuesto nº ${presupuesto.numero} eliminado`,
  });

  revalidatePath(`/clientes/${presupuesto.clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos");

  redirect(
    safeReturnTo(
      formData,
      `/clientes/${presupuesto.clienteId}`,
      "presupuestoEliminado",
    ),
  );
}

export async function updatePresupuesto(formData: FormData) {
  const presupuestoId = requiredId(formData, "presupuestoId");
  const lineas = presupuestoLineasData(formData);
  const ivaPorcentaje = Number(requiredDecimal(formData, "ivaPorcentaje"));
  const totalSinIva = roundCurrency(
    lineas.reduce((sum, linea) => sum + Number(linea.total), 0),
  );
  const totalIva = roundCurrency((totalSinIva * ivaPorcentaje) / 100);
  const totalConIva = roundCurrency(totalSinIva + totalIva);

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: {
      clienteId: true,
      numero: true,
      estado: true,
    },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  const nextEstado = presupuestoEstado(formData);

  await prisma.$transaction([
    prisma.presupuesto.update({
      where: { id: presupuestoId },
      data: {
        titulo: requiredString(formData, "titulo"),
        descripcion: requiredString(formData, "descripcion"),
        estado: nextEstado,
        fecha: requiredDate(formData, "fecha"),
        validezDias: optionalInteger(
          formData,
          "validezDias",
          defaultPresupuestoValidezDias,
        ),
        observaciones: optionalString(formData, "observaciones"),
        ivaPorcentaje: ivaPorcentaje.toFixed(2),
        importe: totalConIva.toFixed(2),
        totalSinIva: totalSinIva.toFixed(2),
        totalIva: totalIva.toFixed(2),
        totalConIva: totalConIva.toFixed(2),
      },
    }),
    prisma.presupuestoLinea.deleteMany({
      where: { presupuestoId },
    }),
    prisma.presupuestoLinea.createMany({
      data: lineas.map((linea) => ({
        presupuestoId,
        ...linea,
      })),
    }),
  ]);

  await registrarActividadCliente({
    clienteId: presupuesto.clienteId,
    tipo: "PRESUPUESTO_EDITADO",
    descripcion: `Presupuesto nº ${presupuesto.numero} editado`,
  });

  revalidatePath(`/clientes/${presupuesto.clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}/pdf`);
  revalidatePath(`/presupuestos/${presupuestoId}/pdf/ver`);

  redirect(safeReturnTo(formData, `/clientes/${presupuesto.clienteId}`));
}

export async function updatePresupuestoCostes(
  _state: PresupuestoCostesState,
  formData: FormData,
): Promise<PresupuestoCostesState> {
  try {
    const presupuestoId = requiredId(formData, "presupuestoId");
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      select: { clienteId: true },
    });
    if (!presupuesto) {
      throw new Error("Presupuesto no encontrado.");
    }

    const materiales = costeMaterialesData(formData);
    const otrosCostes = otrosCostesData(formData);

    await prisma.$transaction([
      prisma.presupuesto.update({
        where: { id: presupuestoId },
        data: {
          costeHorasEstimadas: optionalDecimal(formData, "costeHorasEstimadas"),
          costeHora: optionalDecimal(formData, "costeHora"),
          costeTransporte: optionalDecimal(formData, "costeTransporte"),
          costeMontaje: optionalDecimal(formData, "costeMontaje"),
        },
      }),
      prisma.presupuestoCosteMaterial.deleteMany({
        where: { presupuestoId },
      }),
      prisma.presupuestoCosteOtro.deleteMany({
        where: { presupuestoId },
      }),
      prisma.presupuestoCosteMaterial.createMany({
        data: materiales.map((linea) => ({
          presupuestoId,
          ...linea,
        })),
      }),
      prisma.presupuestoCosteOtro.createMany({
        data: otrosCostes.map((linea) => ({
          presupuestoId,
          ...linea,
        })),
      }),
    ]);

    revalidatePath(`/clientes/${presupuesto.clienteId}`);
    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${presupuestoId}`);

    return {
      status: "success",
      message: "Costes y rentabilidad actualizados.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los costes.",
    };
  }
}

export async function ensurePresupuestoPublicToken(presupuestoId: number) {
  if (!Number.isInteger(presupuestoId) || presupuestoId < 1) {
    throw new Error("Presupuesto no valido.");
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: {
      clienteId: true,
      publicToken: true,
    },
  });
  if (!presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }

  if (presupuesto.publicToken) {
    return presupuesto.publicToken;
  }

  const token = randomUUID();
  const updated = await prisma.presupuesto.updateMany({
    where: {
      id: presupuestoId,
      publicToken: null,
    },
    data: {
      publicToken: token,
      publicTokenCreatedAt: new Date(),
    },
  });

  if (updated.count === 1) {
    revalidatePath(`/clientes/${presupuesto.clienteId}`);
    revalidatePath("/presupuestos");
    return token;
  }

  const refreshed = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { publicToken: true },
  });

  if (!refreshed?.publicToken) {
    throw new Error("No se ha podido generar el enlace publico.");
  }

  return refreshed.publicToken;
}
