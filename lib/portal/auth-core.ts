import { createHash, randomBytes } from "node:crypto";
import type { BusinessRole } from "@prisma/client";

export const PORTAL_COOKIE = "metabot_portal_session";
export const PORTAL_SESSION_SECONDS = 60 * 60 * 24;
export const PORTAL_INVITE_SECONDS = 60 * 60 * 24 * 2;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function normalizePortalEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isStrongPortalPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

export function portalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isPortalToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function portalTokenHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export type PortalPermission = "read" | "handle" | "manage" | "invite";
export function portalRoleAllows(role: BusinessRole, permission: PortalPermission): boolean {
  if (role === "owner") return true;
  if (role === "admin") return true;
  return permission === "read" || permission === "handle";
}

export function canInvitePortalRole(
  inviter: BusinessRole,
  target: BusinessRole,
): boolean {
  if (inviter === "owner") return true;
  if (inviter === "admin") return target === "agent";
  return false;
}
