import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionValue, sessionCookieName } from "@/app/lib/auth";

const publicPathPrefixes = [
  "/login",
  "/presupuestos/publico",
  "/api/uploads",
  "/api/amelia/webhook",
  "/_next",
];

const publicFilePattern = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|txt|xml)$/i;

function isPublicPath(pathname: string) {
  return (
    publicPathPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) || publicFilePattern.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = isValidSessionValue(
    request.cookies.get(sessionCookieName)?.value,
  );

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname) || isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
