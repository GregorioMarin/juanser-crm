import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/app/auth/actions";
import { isValidSessionValue, sessionCookieName } from "@/app/lib/auth";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-medium text-neutral-700";

type LoginPageProps = {
  searchParams: Promise<{
    blocked?: string | string[];
    error?: string | string[];
    next?: string | string[];
  }>;
};

function searchParamString(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function hasError(value?: string | string[]) {
  return searchParamString(value) === "1";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  if (isValidSessionValue(cookieStore.get(sessionCookieName)?.value)) {
    redirect("/");
  }

  const params = await searchParams;
  const next = searchParamString(params.next) || "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 py-8 text-neutral-950">
      <section className="w-full max-w-sm rounded-md border border-neutral-300 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Carpinteria Juanser
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">
          Acceso al CRM
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Introduce las credenciales internas para continuar.
        </p>

        {hasError(params.blocked) ? (
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            Demasiados intentos. Inténtalo de nuevo más tarde.
          </div>
        ) : hasError(params.error) ? (
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            Usuario o contraseña incorrectos.
          </div>
        ) : null}

        <form action={login} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Usuario</span>
            <input
              className={inputClass}
              name="user"
              type="text"
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Contraseña</span>
            <input
              className={inputClass}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
