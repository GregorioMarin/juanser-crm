"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const hiddenPrefixes = ["/login", "/presupuestos/publico"];

export function BackToDashboard() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <div className="bg-neutral-100 px-5 pt-6 text-neutral-950 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-neutral-50 hover:text-emerald-900"
        >
          ← Volver al panel
        </Link>
        {pathname.startsWith("/gastos") ? (
          <Link
            href="/vencimientos"
            className="inline-flex min-h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-neutral-50 hover:text-emerald-900"
          >
            Vencimientos
          </Link>
        ) : null}
      </div>
    </div>
  );
}
