"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionValue,
  expiredSessionCookieOptions,
  isValidCredentials,
  sessionCookieName,
  sessionCookieOptions,
} from "@/app/lib/auth";

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

export async function login(formData: FormData) {
  const user = formString(formData, "user").trim();
  const password = formString(formData, "password");
  const next = safeRedirectPath(formString(formData, "next") || "/");

  if (!isValidCredentials(user, password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

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
