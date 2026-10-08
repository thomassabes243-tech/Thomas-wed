import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/catalog/auth-core";
import { requirePortalPreview, setPortalSession } from "@/lib/portal/auth";
import { normalizePortalEmail } from "@/lib/portal/auth-core";
import {
  clearPortalLoginFailures,
  portalLoginBlocked,
  portalLoginKey,
  recordFailedPortalLogin,
} from "@/lib/portal/login-throttle";

export async function POST(request: NextRequest) {
  requirePortalPreview();
  const form = await request.formData();
  const email = normalizePortalEmail(form.get("email"));
  const password = String(form.get("password") ?? "").slice(0, 256);
  const key = portalLoginKey(email ?? "");
  const error = () => NextResponse.redirect(new URL("/portal/login?error=1", request.url), 303);

  if (await portalLoginBlocked(key)) return error();
  const user = email
    ? await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
    : null;
  const verified = password && user?.passwordHash && verifyAdminPassword(password, user.passwordHash);
  if (!verified) {
    await recordFailedPortalLogin(key);
    return error();
  }
  await clearPortalLoginFailures(key);
  await setPortalSession(user.id);
  return NextResponse.redirect(new URL("/portal", request.url), 303);
}
