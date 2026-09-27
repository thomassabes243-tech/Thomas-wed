import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminEmail } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = getParentalDb();
  const rows = await db.$queryRaw<Array<{
    id: string;
    email: string;
    name: string;
    paired: boolean;
    last_seen_at: Date | null;
    created_at: Date;
  }>>`
    SELECT id, email, name, paired, last_seen_at, created_at
    FROM parental_devices
    ORDER BY created_at DESC
  `;

  return NextResponse.json({
    ok: true,
    adminEmail: adminEmail(),
    devices: rows,
    serverTime: new Date().toISOString(),
  });
}
