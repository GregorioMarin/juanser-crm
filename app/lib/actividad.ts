import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";

export type ActividadClienteTipo =
  | "CLIENTE_CREADO"
  | "ESTADO_CAMBIADO"
  | "PRESUPUESTO_CREADO"
  | "PRESUPUESTO_ELIMINADO"
  | "SEGUIMIENTO_CREADO"
  | "IMAGEN_CLIENTE_SUBIDA"
  | "IMAGEN_JUANSER_SUBIDA";

export async function registrarActividadCliente({
  clienteId,
  tipo,
  descripcion,
  usuario,
}: {
  clienteId: number;
  tipo: ActividadClienteTipo;
  descripcion: string;
  usuario?: string | null;
}) {
  await prisma.actividadCliente.create({
    data: {
      clienteId,
      tipo,
      descripcion,
      usuario: usuario ?? null,
    },
  });

  revalidatePath("/");
}
