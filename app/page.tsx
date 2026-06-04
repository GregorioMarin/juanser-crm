import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { logout } from "@/app/auth/actions";
import { prisma } from "@/app/lib/prisma";

async function getActividadReciente() {
  return prisma.actividadCliente.findMany({
    orderBy: { fecha: "desc" },
    take: 20,
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });
}

type ActividadReciente = Awaited<ReturnType<typeof getActividadReciente>>;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ActividadRecienteCard({
  actividades,
}: {
  actividades: ActividadReciente;
}) {
  return (
    <section className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            ACTIVIDAD RECIENTE
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ultimas acciones registradas en el CRM.
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">
          {actividades.length} acciones
        </span>
      </div>

      {actividades.length > 0 ? (
        <ol className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {actividades.map((actividad) => (
            <li
              key={actividad.id}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_1fr_auto] sm:items-center"
            >
              <time className="text-sm font-semibold text-neutral-950">
                {formatDateTime(actividad.fecha)}
              </time>
              <p className="text-sm text-neutral-700">{actividad.descripcion}</p>
              <Link
                href={`/clientes/${actividad.cliente.id}`}
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
              >
                {actividad.cliente.nombre}
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
          Todavia no hay actividad registrada.
        </p>
      )}
    </section>
  );
}

export default async function Home() {
  await connection();

  const actividades = await getActividadReciente();

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <Image
              src="/logo-juanser.jpeg"
              alt="Carpintería Juanser"
              width={150}
              height={100}
              className="h-16 w-auto rounded-sm object-contain sm:h-[68px]"
              sizes="100px"
            />
            <h1 className="text-3xl font-semibold tracking-normal text-neutral-950 sm:text-4xl">
              CRM Carpintería Juanser
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              href="/clientes"
              className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Abrir cartera
            </Link>
            <Link
              href="/presupuestos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Ver presupuestos
            </Link>
            <Link
              href="/kanban"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Kanban
            </Link>
            <Link
              href="/citas"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Citas
            </Link>
            <Link
              href="/proveedores"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Proveedores
            </Link>
            <Link
              href="/trabajos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Trabajos terminados
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 sm:w-auto"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <ActividadRecienteCard actividades={actividades} />
      </div>
    </main>
  );
}
