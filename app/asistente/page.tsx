import Link from "next/link";
import { AsistenteClient } from "./asistente-client";

export default function AsistentePage() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-neutral-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
            >
              ← Volver al dashboard
            </Link>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Carpintería Juanser
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Asistente IA
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Convierte mensajes, imágenes y documentos en acciones comerciales listas
              para revisar.
            </p>
          </div>
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            Revisión humana antes de guardar
          </span>
        </header>
        <AsistenteClient />
      </div>
    </main>
  );
}

