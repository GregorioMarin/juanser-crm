type LoginAttempt = {
  count: number;
  blockedUntil: number;
};

const maxFailedAttempts = 5;
const blockDurationMs = 15 * 60 * 1000;

const globalForLoginAttempts = globalThis as unknown as {
  loginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts = globalForLoginAttempts.loginAttempts ?? new Map();
globalForLoginAttempts.loginAttempts = loginAttempts;

function currentAttempt(ip: string) {
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return null;
  }

  if (attempt.blockedUntil > 0 && attempt.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
    return null;
  }

  return attempt;
}

export function isLoginBlocked(ip: string) {
  const attempt = currentAttempt(ip);

  return Boolean(attempt && attempt.blockedUntil > Date.now());
}

export function recordFailedLogin(ip: string) {
  const attempt = currentAttempt(ip) ?? { count: 0, blockedUntil: 0 };
  const nextCount = attempt.count + 1;
  const blockedUntil =
    nextCount >= maxFailedAttempts ? Date.now() + blockDurationMs : 0;

  loginAttempts.set(ip, {
    count: nextCount,
    blockedUntil,
  });

  return blockedUntil > Date.now();
}

export function clearFailedLogins(ip: string) {
  loginAttempts.delete(ip);
}
