import { NextResponse } from "next/server";
import { z } from "zod";
import { getParentalDb } from "@/lib/parental/db";
import { randomId, randomPairingCode, randomToken, sha256 } from "@/lib/parental/security";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();
    const id = randomId();
    const token = randomToken();
    const code = randomPairingCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.$executeRaw`
      INSERT INTO parental_devices
      (id, email, name, token_hash, pairing_code_hash, pairing_expires_at, paired, last_seen_at, created_at, updated_at)
      VALUES
      (${id}, ${input.email.toLowerCase()}, ${input.name}, ${sha256(token)}, ${sha256(code)}, ${expiresAt}, FALSE, NOW(), NOW(), NOW())
    `;

    return NextResponse.json({
      ok: true,
      deviceId: id,
      token,
      pairingCode: code,
      pairingExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}
