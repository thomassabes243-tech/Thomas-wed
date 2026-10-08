import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdminPasswordHash } from "@/lib/catalog/auth-core";
import { currentPortalUser, requirePortalPreview, setPortalSession } from "@/lib/portal/auth";
import { isPortalToken, isStrongPortalPassword, portalTokenHash } from "@/lib/portal/auth-core";

export async function POST(request: NextRequest) {
  requirePortalPreview();
  const form = await request.formData();
  const token = form.get("token");
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const password = form.get("password");
  const reject = () => NextResponse.redirect(new URL("/portal/login?inviteError=1", request.url), 303);
  if (!isPortalToken(token)) return reject();
  const existingSession = await currentPortalUser();
  const now = new Date();
  const record = await db.portalInvite.findUnique({
    where: { tokenHash: portalTokenHash(token) },
  });
  if (!record || record.usedAt || record.expiresAt <= now) return reject();
  const existingUser = await db.user.findUnique({ where: { email: record.email } });
  // Established users must prove they own their account by signing in first.
  if (existingUser?.passwordHash && existingSession?.id !== existingUser.id) return reject();
  if (!existingUser?.passwordHash && !isStrongPortalPassword(password)) return reject();
  const newHash = existingUser?.passwordHash ? null : createAdminPasswordHash(password as string);

  let userId: string;
  try {
    userId = await db.$transaction(async tx => {
      const claim = await tx.portalInvite.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) throw new Error("Invitación usada.");
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: newHash ? { passwordHash: newHash, name: name || existingUser.name } : {},
          })
        : await tx.user.create({
            data: { email: record.email, name: name || null, passwordHash: newHash! },
          });
      await tx.businessUser.upsert({
        where: { userId_businessId: { userId: user.id, businessId: record.businessId } },
        update: {},
        create: { userId: user.id, businessId: record.businessId, role: record.role },
      });
      return user.id;
    });
  } catch {
    return reject();
  }
  await setPortalSession(userId);
  return NextResponse.redirect(new URL("/portal", request.url), 303);
}
