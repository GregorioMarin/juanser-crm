"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartItem = {
  name: string;
  total: number;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartPanel({
  title,
  data,
  type = "bar",
}: {
  title: string;
  data: ChartItem[];
  type?: "bar" | "line";
}) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-neutral-950">{title}</h2>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 18, left: 8, bottom: 10 }}>
              <CartesianGrid stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => currency(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => currency(Number(value))} />
              <Line type="monotone" dataKey="total" stroke="#047857" strokeWidth={3} dot />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 18, left: 8, bottom: 10 }}>
              <CartesianGrid stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => currency(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => currency(Number(value))} />
              <Bar dataKey="total" fill="#047857" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function GastosCharts({
  porMes,
  porProveedor,
  porCategoria,
  evolucionAnual,
}: {
  porMes: ChartItem[];
  porProveedor: ChartItem[];
  porCategoria: ChartItem[];
  evolucionAnual: ChartItem[];
}) {
  return (
    <div className="grid gap-6">
      <ChartPanel title="Gasto total por mes" data={porMes} type="line" />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Gasto total por proveedor" data={porProveedor} />
        <ChartPanel title="Gasto total por categoría" data={porCategoria} />
      </div>
      <ChartPanel title="Evolución anual" data={evolucionAnual} type="line" />
    </div>
  );
}
