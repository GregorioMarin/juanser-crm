import { createHmac, timingSafeEqual } from "crypto";
import {
  sessionCookieName,
  sessionDurationSeconds,
} from "@/app/lib/auth-constants";

export { sessionCookieName, sessionDurationSeconds };

type SessionPayload = {
  user: string;
  expiresAt: number;
};

function configuredUser() {
  return process.env.CRM_USER?.trim() || null;
}

function configuredPassword() {
  return process.env.CRM_PASSWORD || null;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionValue(user: string) {
  const password = configuredPassword();

  if (!password) {
    throw new Error("CRM_PASSWORD no esta configurada.");
  }

  const payload: SessionPayload = {
    user,
    expiresAt: Date.now() + sessionDurationSeconds * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, password);

  return `${encodedPayload}.${signature}`;
}

export function isValidSessionValue(value?: string | null) {
  const user = configuredUser();
  const password = configuredPassword();

  if (!value || !user || !password) {
    return false;
  }

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload, password);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    return payload.user === user && Number(payload.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function isValidCredentials(user: string, password: string) {
  const expectedUser = configuredUser();
  const expectedPassword = configuredPassword();

  if (!expectedUser || !expectedPassword) {
    return false;
  }

  return safeEqual(user, expectedUser) && safeEqual(password, expectedPassword);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionDurationSeconds,
    path: "/",
  };
}

export function expiredSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}
