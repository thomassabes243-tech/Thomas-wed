import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(8).max(100),
  mime: z.string().max(80),
  dataBase64: z.string().min(1).max(1_800_000),
});

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();
    await db.$executeRaw`
      UPDATE parental_sessions
      SET latest_payload = ${input.dataBase64},
          latest_mime = ${input.mime},
          payload_updated_at = NOW()
      WHERE id = ${input.sessionId}
        AND device_id = ${device.id}
        AND status = 'active'
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_media" }, { status: 400 });
  }
}
