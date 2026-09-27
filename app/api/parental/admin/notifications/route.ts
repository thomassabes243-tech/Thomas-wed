import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "device_required" }, { status: 400 });
  }

  const db = getParentalDb();
  const rows = await db.$queryRaw<Array<{
    id: string;
    app_name: string;
    title: string | null;
    body: string | null;
    created_at: Date;
  }>>`
    SELECT id, app_name, title, body, created_at
    FROM parental_notifications
    WHERE device_id = ${deviceId}
    ORDER BY created_at DESC
    LIMIT 80
  `;

  return NextResponse.json({ ok: true, notifications: rows });
}
