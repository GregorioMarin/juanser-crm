import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  CalculadoraArmariosClient,
  type SavedCalculoArmario,
} from "./calculadora-armarios-client";

function toNumber(value: { toString(): string }) {
  return Number(value.toString());
}

async function getCalculos(): Promise<SavedCalculoArmario[]> {
  const calculos = await prisma.calculoArmario.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return calculos.map((calculo) => ({
    id: calculo.id,
    fecha: calculo.fecha.toISOString(),
    anchoCm: toNumber(calculo.anchoCm),
    altoCm: toNumber(calculo.altoCm),
    fondoCm: toNumber(calculo.fondoCm),
    tipoPuertas: calculo.tipoPuertas,
    numeroPuertas: calculo.numeroPuertas,
    numeroModulos: calculo.numeroModulos,
    numeroCajones: calculo.numeroCajones,
    numeroBaldas: calculo.numeroBaldas,
    numeroBarras: calculo.numeroBarras,
    tipoTrasera: calculo.tipoTrasera,
    materialPrincipal: calculo.materialPrincipal,
    grosorPrincipalMm: calculo.grosorPrincipalMm,
    observaciones: calculo.observaciones,
    metrosFrontales: toNumber(calculo.metrosFrontales),
    metrosTableroPrincipal: toNumber(calculo.metrosTableroPrincipal),
    tablerosPrincipales: calculo.tablerosPrincipales,
    metrosTrasera: toNumber(calculo.metrosTrasera),
    tablerosTrasera: calculo.tablerosTrasera,
    metrosCanto: toNumber(calculo.metrosCanto),
    bisagras: calculo.bisagras,
    guiasCajon: calculo.guiasCajon,
    metrosBarra: toNumber(calculo.metrosBarra),
    complejidad: calculo.complejidad,
  }));
}

export default async function CalculadoraArmariosPage() {
  await connection();

  const calculos = await getCalculos();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-neutral-300 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Calculadoras internas
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
              Calculadora de Armarios
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Estimacion profesional de tablero, trasera, canto y herrajes para
              fabricacion interna de armarios a medida.
            </p>
          </div>
        </header>

        <CalculadoraArmariosClient initialCalculos={calculos} />
      </div>
    </main>
  );
}
