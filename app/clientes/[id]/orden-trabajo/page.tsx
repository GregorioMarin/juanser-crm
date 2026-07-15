import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "./print-button";
import styles from "./orden-trabajo.module.css";

export const runtime = "nodejs";

type OrdenTrabajoPageProps = {
  params: Promise<{ id: string }>;
};

async function getOrdenTrabajoCliente(id: number) {
  return prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      direccion: true,
      localidad: true,
    },
  });
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className={styles.clientField}>
      <strong className={styles.label}>{label}</strong>
      <span>{value || "\u00a0"}</span>
    </div>
  );
}

export default async function OrdenTrabajoPage({ params }: OrdenTrabajoPageProps) {
  await connection();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const cliente = await getOrdenTrabajoCliente(id);
  if (!cliente) {
    notFound();
  }

  const direccion = [cliente.direccion, cliente.localidad].filter(Boolean).join(", ");

  return (
    <main className={styles.page}>
      <div className={styles.actions}>
        <Link href={`/clientes/${cliente.id}`}>Volver a la ficha</Link>
        <PrintButton />
      </div>

      <article className={styles.sheet} aria-label="Orden de trabajo">
        <header className={styles.header}>
          <div className={styles.logoBlock}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              src="/logo-juanser.jpeg"
              alt="Carpintería Juanser"
            />
          </div>
          <div className={styles.titleBlock}>
            <h1>ORDEN DE TRABAJO</h1>
          </div>
          <div className={styles.meta}>
            <div className={styles.lineField}>
              <strong className={styles.label}>Fecha</strong>
              <span>{formatDate(new Date())}</span>
            </div>
          </div>
        </header>

        <section className={styles.clientData} aria-label="Datos del cliente">
          <Field label="Cliente" value={cliente.nombre} />
          <Field label="Teléfono" value={cliente.telefono} />
          <Field label="Dirección" value={direccion} />
        </section>

        <section className={styles.sketchBox} aria-label="Espacio para bocetos y mediciones" />

        <section className={styles.observationsBox} aria-label="Observaciones">
          <h2>Observaciones</h2>
        </section>
      </article>
    </main>
  );
}
