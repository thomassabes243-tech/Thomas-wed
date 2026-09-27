import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest, randomId } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

const schema = z.object({
  deviceId: z.string().min(8).max(100),
  kind: z.enum(["audio", "screen"]),
  action: z.enum(["start", "stop"]),
});

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();

    if (input.action === "stop") {
      await db.$executeRaw`
        UPDATE parental_sessions
        SET status = 'stop_requested'
        WHERE device_id = ${input.deviceId}
          AND kind = ${input.kind}
          AND status IN ('requested', 'active')
      `;
      return NextResponse.json({ ok: true });
    }

    await db.$executeRaw`
      UPDATE parental_sessions
      SET status = 'ended', ended_at = NOW()
      WHERE device_id = ${input.deviceId}
        AND kind = ${input.kind}
        AND status IN ('requested', 'active', 'stop_requested')
    `;

    const sessionId = randomId();
    await db.$executeRaw`
      INSERT INTO parental_sessions
      (id, device_id, kind, status, requested_at)
      VALUES
      (${sessionId}, ${input.deviceId}, ${input.kind}, 'requested', NOW())
    `;

    return NextResponse.json({ ok: true, sessionId });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_session_request" }, { status: 400 });
  }
}
