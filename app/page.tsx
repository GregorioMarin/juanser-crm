import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
              Carpinteria Juanser
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-neutral-950 sm:text-4xl">
              Gestor comercial
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">Modulo activo</p>
            <p className="mt-2 text-xl font-semibold text-neutral-950">
              Clientes y presupuestos
            </p>
          </div>
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">Base de datos</p>
            <p className="mt-2 text-xl font-semibold text-neutral-950">
              PostgreSQL
            </p>
          </div>
          <div className="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">ORM</p>
            <p className="mt-2 text-xl font-semibold text-neutral-950">Prisma</p>
          </div>
        </section>
      </div>
    </main>
  );
}
