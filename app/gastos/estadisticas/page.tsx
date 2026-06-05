import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { GastosCharts } from "./charts";

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "short",
  year: "2-digit",
});

function toNumber(value?: { toString(): string } | null) {
  return Number(value?.toString() ?? 0);
}

function lastTwelveMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      name: monthFormatter.format(date),
      total: 0,
    };
  });
}

async function getStats() {
  const gastos = await prisma.gasto.findMany({
    select: {
      fecha: true,
      total: true,
      proveedor: true,
      categoria: true,
    },
  });

  const meses = lastTwelveMonths();
  const porMesMap = new Map(meses.map((month) => [month.key, month]));
  const porProveedor = new Map<string, number>();
  const porCategoria = new Map<string, number>();
  const porAno = new Map<string, number>();

  for (const gasto of gastos) {
    const total = toNumber(gasto.total);
    const fecha = gasto.fecha;
    if (fecha) {
      const monthKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      const month = porMesMap.get(monthKey);
      if (month) {
        month.total += total;
      }

      const yearKey = String(fecha.getFullYear());
      porAno.set(yearKey, (porAno.get(yearKey) ?? 0) + total);
    }

    const proveedor = gasto.proveedor || "Sin proveedor";
    const categoria = gasto.categoria || "Sin categoría";
    porProveedor.set(proveedor, (porProveedor.get(proveedor) ?? 0) + total);
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + total);
  }

  const sortByTotal = ([, a]: [string, number], [, b]: [string, number]) => b - a;

  return {
    porMes: meses,
    porProveedor: [...porProveedor.entries()]
      .sort(sortByTotal)
      .slice(0, 12)
      .map(([name, total]) => ({ name, total })),
    porCategoria: [...porCategoria.entries()]
      .sort(sortByTotal)
      .map(([name, total]) => ({ name, total })),
    evolucionAnual: [...porAno.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, total]) => ({ name, total })),
  };
}

export default async function GastosEstadisticasPage() {
  await connection();

  const stats = await getStats();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/gastos"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              Volver a gastos
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
              Estadísticas de gastos
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Lectura mensual, anual y por origen de compra.
            </p>
          </div>
          <Link
            href="/gastos/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Nuevo gasto
          </Link>
        </header>

        <GastosCharts {...stats} />
      </div>
    </main>
  );
}
