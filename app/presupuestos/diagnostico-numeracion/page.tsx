import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";

const standardPresupuestoPattern = /^PJ-(\d{4})-(\d{4,})$/;

type PresupuestoNumero = {
  id: number;
  numero: string;
  fecha: Date;
  titulo: string;
  cliente: {
    id: number;
    nombre: string;
  };
};

function classifyPresupuestoNumero(numero: string) {
  if (standardPresupuestoPattern.test(numero)) {
    return "Formato estándar PJ-AAAA-XXXX";
  }

  if (/^\d{4}-\d+$/.test(numero)) {
    return "Formato antiguo tipo AAAA-XXXX";
  }

  if (/^PJ-\d{4}-\d+$/.test(numero)) {
    return "Formato PJ con padding distinto";
  }

  if (!/\d+$/.test(numero)) {
    return "Sin parte numérica final";
  }

  return "Otro formato con numeración final";
}

function numericPart(numero: string) {
  const match = numero.match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function groupDuplicates(presupuestos: PresupuestoNumero[]) {
  const grouped = new Map<string, PresupuestoNumero[]>();
  presupuestos.forEach((presupuesto) => {
    const current = grouped.get(presupuesto.numero) ?? [];
    current.push(presupuesto);
    grouped.set(presupuesto.numero, current);
  });

  return Array.from(grouped.entries())
    .filter(([, items]) => items.length > 1)
    .map(([numero, items]) => ({ numero, items }));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function sequenceGaps(presupuestos: PresupuestoNumero[]) {
  const byYear = new Map<string, number[]>();

  presupuestos.forEach((presupuesto) => {
    const match = presupuesto.numero.match(standardPresupuestoPattern);
    if (!match) {
      return;
    }

    const [, year] = match;
    const number = numericPart(presupuesto.numero);
    if (number === null) {
      return;
    }

    const current = byYear.get(year) ?? [];
    current.push(number);
    byYear.set(year, current);
  });

  return Array.from(byYear.entries()).flatMap(([year, numbers]) => {
    const uniqueNumbers = Array.from(new Set(numbers)).sort((a, b) => a - b);
    const gaps: { year: string; from: number; to: number; missing: number }[] = [];

    uniqueNumbers.forEach((number, index) => {
      const previous = uniqueNumbers[index - 1];
      if (previous === undefined || number === previous + 1) {
        return;
      }

      gaps.push({
        year,
        from: previous + 1,
        to: number - 1,
        missing: number - previous - 1,
      });
    });

    return gaps;
  });
}

function affectedPresupuestoIds(
  duplicates: ReturnType<typeof groupDuplicates>,
  nonStandard: PresupuestoNumero[],
) {
  const ids = new Set<number>();
  duplicates.forEach((duplicate) => {
    duplicate.items.forEach((item) => ids.add(item.id));
  });
  nonStandard.forEach((item) => ids.add(item.id));

  return ids.size;
}

async function getDiagnostics() {
  const [presupuestos, gastos, pedidoLineas] = await Promise.all([
    prisma.presupuesto.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        numero: true,
        fecha: true,
        titulo: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    }),
    prisma.gasto.findMany({
      where: {
        numeroDocumento: { not: null },
      },
      select: {
        id: true,
        tipoDocumento: true,
        proveedor: true,
        numeroDocumento: true,
      },
    }),
    prisma.gastoLinea.findMany({
      where: {
        pedidoProveedor: { not: null },
      },
      select: {
        id: true,
        pedidoProveedor: true,
        gasto: {
          select: {
            id: true,
            proveedor: true,
            numeroDocumento: true,
          },
        },
      },
    }),
  ]);

  const duplicates = groupDuplicates(presupuestos);
  const nonStandard = presupuestos.filter(
    (presupuesto) => !standardPresupuestoPattern.test(presupuesto.numero),
  );
  const gaps = sequenceGaps(presupuestos);
  const formats = Array.from(
    presupuestos.reduce((map, presupuesto) => {
      const label = classifyPresupuestoNumero(presupuesto.numero);
      map.set(label, (map.get(label) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([label, count]) => ({ label, count }));

  const gastosDuplicados = groupExternalNumbers(
    gastos
      .filter((gasto) => gasto.numeroDocumento)
      .map((gasto) => ({
        key: `${gasto.tipoDocumento ?? "documento"}:${gasto.numeroDocumento}`,
        label: `${gasto.tipoDocumento ?? "documento"} ${gasto.numeroDocumento}`,
      })),
  );
  const pedidosDuplicados = groupExternalNumbers(
    pedidoLineas
      .filter((linea) => linea.pedidoProveedor)
      .map((linea) => ({
        key: linea.pedidoProveedor ?? "",
        label: linea.pedidoProveedor ?? "",
      })),
  );

  return {
    presupuestos,
    duplicates,
    nonStandard,
    gaps,
    formats,
    affectedCount: affectedPresupuestoIds(duplicates, nonStandard),
    gastosCount: gastos.length,
    gastosDuplicados,
    pedidosCount: pedidoLineas.length,
    pedidosDuplicados,
  };
}

function groupExternalNumbers(items: { key: string; label: string }[]) {
  const grouped = new Map<string, { label: string; count: number }>();
  items.forEach((item) => {
    const current = grouped.get(item.key);
    grouped.set(item.key, {
      label: item.label,
      count: (current?.count ?? 0) + 1,
    });
  });

  return Array.from(grouped.values())
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

export default async function DiagnosticoNumeracionPage() {
  await connection();

  const diagnostics = await getDiagnostics();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="border-b border-neutral-300 pb-5">
          <Link
            href="/presupuestos"
            className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            Volver a presupuestos
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950">
            Diagnóstico de numeración
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Informe temporal de solo lectura. No modifica presupuestos ni documentos
            históricos.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Presupuestos" value={diagnostics.presupuestos.length} />
          <SummaryCard label="Duplicados" value={diagnostics.duplicates.length} />
          <SummaryCard label="Formato no estándar" value={diagnostics.nonStandard.length} />
          <SummaryCard label="Registros afectados" value={diagnostics.affectedCount} />
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Formato objetivo</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Todos los presupuestos nuevos deben generarse automáticamente como
            <strong> PJ-AAAA-XXXX</strong>, por ejemplo <strong>PJ-2026-0001</strong>.
            La parte numérica final se incrementa desde el último presupuesto existente.
          </p>
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Formatos detectados</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3 text-right">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {diagnostics.formats.map((format) => (
                  <tr key={format.label}>
                    <td className="px-4 py-3">{format.label}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {format.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Duplicados</h2>
          {diagnostics.duplicates.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {diagnostics.duplicates.map((duplicate) => (
                <div
                  key={duplicate.numero}
                  className="rounded-md border border-rose-200 bg-rose-50 p-4"
                >
                  <p className="font-semibold text-rose-950">
                    {duplicate.numero}: {duplicate.items.length} registros
                  </p>
                  <ul className="mt-2 grid gap-1 text-sm text-rose-900">
                    {duplicate.items.map((item) => (
                      <li key={item.id}>
                        #{item.id} · {item.cliente.nombre} · {item.titulo} ·{" "}
                        {formatDate(item.fecha)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">
              No se han detectado números de presupuesto duplicados.
            </p>
          )}
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Presupuestos con formato distinto
          </h2>
          {diagnostics.nonStandard.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo detectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {diagnostics.nonStandard.map((presupuesto) => (
                    <tr key={presupuesto.id}>
                      <td className="px-4 py-3">#{presupuesto.id}</td>
                      <td className="px-4 py-3 font-semibold">{presupuesto.numero}</td>
                      <td className="px-4 py-3">{presupuesto.cliente.nombre}</td>
                      <td className="px-4 py-3">{formatDate(presupuesto.fecha)}</td>
                      <td className="px-4 py-3">
                        {classifyPresupuestoNumero(presupuesto.numero)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">
              Todos los presupuestos siguen el formato objetivo.
            </p>
          )}
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">Saltos de secuencia</h2>
          {diagnostics.gaps.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm text-neutral-700">
              {diagnostics.gaps.map((gap) => (
                <li key={`${gap.year}-${gap.from}-${gap.to}`}>
                  Año {gap.year}: faltan {gap.missing} números entre{" "}
                  {String(gap.from).padStart(4, "0")} y{" "}
                  {String(gap.to).padStart(4, "0")}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">
              No se han detectado saltos dentro de las secuencias con formato estándar.
            </p>
          )}
        </section>

        <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Otros documentos numerados
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="font-semibold text-neutral-950">Gastos</h3>
              <p className="mt-2 text-sm text-neutral-700">
                Se han encontrado {diagnostics.gastosCount} gastos con número de
                documento externo. Corresponden a facturas, albaranes o tickets de
                proveedor y no son una secuencia interna del CRM.
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                Duplicados externos detectados: {diagnostics.gastosDuplicados.length}.
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="font-semibold text-neutral-950">Pedidos de proveedor</h3>
              <p className="mt-2 text-sm text-neutral-700">
                Se han encontrado {diagnostics.pedidosCount} líneas de gasto con pedido
                de proveedor. Es también numeración externa.
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                Repeticiones detectadas: {diagnostics.pedidosDuplicados.length}.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-neutral-700">
            No hay modelos internos de facturas, albaranes o pedidos con secuencia
            propia en el esquema actual. Si se añaden en el futuro, conviene aplicar la
            misma estrategia: formato único, generación transaccional y restricción
            UNIQUE.
          </p>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="text-lg font-semibold">Estrategia recomendada</h2>
          <p className="mt-2">
            No renumerar automáticamente. Primero revisar duplicados y formatos antiguos,
            elegir una equivalencia por cada registro afectado y ejecutar una migración
            manual controlada. Después aplicar la restricción UNIQUE en base de datos.
          </p>
        </section>
      </div>
    </main>
  );
}
