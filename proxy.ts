import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/app/lib/auth-constants";

type SessionPayload = {
  user?: string;
  expiresAt?: number;
};

const publicPathPrefixes = [
  "/login",
  "/presupuestos/publico",
  "/api/uploads",
  "/api/amelia/webhook",
];

function isPublicPath(pathname: string) {
  return publicPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return bytesToBase64Url(signature);
}

async function isValidSessionValue(value?: string | null) {
  const user = process.env.CRM_USER?.trim();
  const password = process.env.CRM_PASSWORD;

  if (!value || !user || !password) {
    return false;
  }

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = await sign(encodedPayload, password);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
    ) as SessionPayload;

    return payload.user === user && Number(payload.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(sessionCookieName)?.value;
  const isAuthenticated = await isValidSessionValue(cookieValue);

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
  matcher: [
    "/",
    "/login",
    "/clientes/:path*",
    "/asistente/:path*",
    "/presupuestos/:path*",
    "/proveedores/:path*",
    "/trabajos/:path*",
    "/citas/:path*",
    "/gastos/:path*",
    "/vencimientos/:path*",
    "/kanban/:path*",
    "/api/uploads/:path*",
    "/api/amelia/webhook",
    "/api/asistente/:path*",
  ],
};
