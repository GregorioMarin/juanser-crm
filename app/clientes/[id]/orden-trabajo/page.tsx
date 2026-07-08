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
      email: true,
      direccion: true,
      localidad: true,
      tipoTrabajo: true,
      fechaMedicion: true,
      fechaInstalacion: true,
      observaciones: true,
      presupuestos: {
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        select: {
          numero: true,
          titulo: true,
          descripcion: true,
          estado: true,
        },
      },
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

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0) ?? "";
}

function Field({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value?: string | null;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${styles.clientField} ${fullWidth ? styles.fullWidth : ""}`}>
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

  const presupuestoReferencia =
    cliente.presupuestos.find((presupuesto) => presupuesto.estado === "ACEPTADO") ??
    cliente.presupuestos[0];
  const direccion = [cliente.direccion, cliente.localidad].filter(Boolean).join(", ");
  const descripcionTrabajo = firstText(
    cliente.tipoTrabajo,
    presupuestoReferencia?.titulo,
    presupuestoReferencia?.descripcion,
    cliente.observaciones,
  );
  const fechaPrevista = cliente.fechaInstalacion ?? cliente.fechaMedicion;

  return (
    <main className={styles.page}>
      <div className={styles.actions}>
        <Link href={`/clientes/${cliente.id}`}>Volver a la ficha</Link>
        <PrintButton />
      </div>

      <article className={styles.sheet} aria-label="Orden de trabajo">
        <header className={styles.header}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              src="/logo-juanser.jpeg"
              alt="Carpintería Juanser"
            />
          </div>
          <div className={styles.titleBlock}>
            <h1>ORDEN DE TRABAJO</h1>
            <p className={styles.company}>Carpintería Juanser</p>
          </div>
          <div className={styles.meta}>
            <div className={styles.lineField}>
              <strong className={styles.label}>Fecha</strong>
              <span>{formatDate(new Date())}</span>
            </div>
            <div className={styles.lineField}>
              <strong className={styles.label}>Nº orden</strong>
              <span>{presupuestoReferencia?.numero || "\u00a0"}</span>
            </div>
          </div>
        </header>

        <section className={styles.clientData} aria-label="Datos del cliente">
          <Field label="Cliente" value={cliente.nombre} />
          <Field label="Teléfono" value={cliente.telefono} />
          <Field label="Dirección" value={direccion} fullWidth />
          <Field label="Email" value={cliente.email} />
          <Field label="Fecha prevista" value={formatDate(fechaPrevista)} />
          <Field label="Tipo de trabajo" value={descripcionTrabajo} fullWidth />
        </section>

        <section className={styles.sketchSection} aria-label="Boceto del trabajo">
          <h2 className={styles.boxTitle}>Boceto del trabajo</h2>
          <div className={styles.sketchBox} />
        </section>

        <section className={styles.bottomBoxes} aria-label="Notas manuales">
          <div className={styles.manualBox}>
            <h2>Herrajes necesarios</h2>
          </div>
          <div className={styles.manualBox}>
            <h2>Observaciones</h2>
          </div>
        </section>
      </article>
    </main>
  );
}
