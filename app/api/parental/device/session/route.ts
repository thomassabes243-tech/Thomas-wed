import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(8).max(100),
  status: z.enum(["active", "ended", "denied", "error"]),
});

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();

    if (input.status === "active") {
      await db.$executeRaw`
        UPDATE parental_sessions
        SET status = 'active', started_at = COALESCE(started_at, NOW())
        WHERE id = ${input.sessionId} AND device_id = ${device.id}
      `;
    } else {
      await db.$executeRaw`
        UPDATE parental_sessions
        SET status = ${input.status}, ended_at = NOW()
        WHERE id = ${input.sessionId} AND device_id = ${device.id}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }
}
