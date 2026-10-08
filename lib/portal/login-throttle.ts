import { db } from "@/lib/db";
import { portalTokenHash } from "./auth-core";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const DUMMY_EMAIL = "unknown-portal-account";

export function portalLoginKey(email: string) {
  return portalTokenHash(email || DUMMY_EMAIL);
}

export async function portalLoginBlocked(key: string, now = new Date()): Promise<boolean> {
  const record = await db.portalLoginAttempt.findUnique({ where: { emailHash: key } });
  return Boolean(record?.blockedUntil && record.blockedUntil > now);
}

export async function recordFailedPortalLogin(key: string, now = new Date()) {
  const existing = await db.portalLoginAttempt.findUnique({ where: { emailHash: key } });
  if (!existing || now.getTime() - existing.windowStartedAt.getTime() >= WINDOW_MS) {
    await db.portalLoginAttempt.upsert({
      where: { emailHash: key },
      create: { emailHash: key, failures: 1, windowStartedAt: now, blockedUntil: null },
      update: { failures: 1, windowStartedAt: now, blockedUntil: null },
    });
    return;
  }
  const failures = existing.failures + 1;
  await db.portalLoginAttempt.update({
    where: { emailHash: key },
    data: {
      failures: { increment: 1 },
      blockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + WINDOW_MS) : existing.blockedUntil,
    },
  });
}

export async function clearPortalLoginFailures(key: string) {
  await db.portalLoginAttempt.deleteMany({ where: { emailHash: key } });
}
