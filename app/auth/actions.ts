"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionValue,
  expiredSessionCookieOptions,
  isValidCredentials,
  sessionCookieName,
  sessionCookieOptions,
} from "@/app/lib/auth";
import {
  clearFailedLogins,
  isLoginBlocked,
  recordFailedLogin,
} from "@/app/lib/login-rate-limit";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function safeRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (
    value.startsWith("/login") ||
    value.startsWith("/api/") ||
    value.startsWith("/_next/")
  ) {
    return "/";
  }

  return value;
}

function redirectToLogin(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  redirect(`/login?${searchParams.toString()}`);
}

async function clientIp() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ||
    headersList.get("x-real-ip")?.trim() ||
    headersList.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export async function login(formData: FormData) {
  const user = formString(formData, "user").trim();
  const password = formString(formData, "password");
  const next = safeRedirectPath(formString(formData, "next") || "/");
  const ip = await clientIp();

  if (isLoginBlocked(ip)) {
    redirectToLogin({ blocked: "1", next });
  }

  if (!isValidCredentials(user, password)) {
    if (recordFailedLogin(ip)) {
      redirectToLogin({ blocked: "1", next });
    }

    redirectToLogin({ error: "1", next });
  }

  clearFailedLogins(ip);

  const cookieStore = await cookies();
  cookieStore.set({
    name: sessionCookieName,
    value: createSessionValue(user),
    ...sessionCookieOptions(),
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: sessionCookieName,
    value: "",
    ...expiredSessionCookieOptions(),
  });

  redirect("/login");
}
