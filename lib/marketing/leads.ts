import { createHash } from "node:crypto";
import { z } from "zod";

// A new lead cannot change user/tenant authorization; all fields are explicitly whitelisted.
export const LeadRequest = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  phone: z.string().trim().max(40).optional().default(""),
  sector: z.enum(["restaurante", "tienda", "turismo", "salon", "servicios", "otro"]),
  interest: z.enum(["whatsapp", "automation", "both"]),
  message: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
  website: z.string().max(150).optional().default(""),
}).strict();

export const LeadStatus = z.enum(["new", "contacted", "closed"]);

// Deterministic per email/day, so automatic retries cannot create many leads.
export function leadSubmissionKey(email: string, day: Date): string {
  const date = day.toISOString().slice(0, 10);
  return createHash("sha256").update(email.toLowerCase() + "|" + date, "utf8").digest("hex");
}

export function isPublicLeadCaptureEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.METABOT_LEAD_CAPTURE_ENABLED === "true" && Boolean(env.DATABASE_URL);
}
