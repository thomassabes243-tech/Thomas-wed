import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) return NextResponse.json({ ok: false }, { status: 401 });

  const db = getParentalDb();
  await db.$executeRaw`
    UPDATE parental_devices SET last_seen_at = NOW(), updated_at = NOW() WHERE id = ${device.id}
  `;

  const rows = await db.$queryRaw<Array<{
    id: string;
    kind: string;
    status: string;
    requested_at: Date;
  }>>`
    SELECT id, kind, status, requested_at
    FROM parental_sessions
    WHERE device_id = ${device.id}
      AND status IN ('requested', 'active', 'stop_requested')
    ORDER BY requested_at DESC
    LIMIT 1
  `;

  return NextResponse.json({ ok: true, paired: device.paired, command: rows[0] || null });
}
