import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getParentalDb();
  await db.$executeRaw`
    UPDATE parental_devices
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE id = ${device.id}
  `;
  return NextResponse.json({ ok: true, paired: device.paired });
}
