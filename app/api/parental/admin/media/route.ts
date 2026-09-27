import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  const kind = request.nextUrl.searchParams.get("kind");
  if (!deviceId || (kind !== "audio" && kind !== "screen")) {
    return NextResponse.json({ ok: false, error: "invalid_query" }, { status: 400 });
  }

  const db = getParentalDb();
  const rows = await db.$queryRaw<Array<{
    id: string;
    status: string;
    latest_payload: string | null;
    latest_mime: string | null;
    payload_updated_at: Date | null;
  }>>`
    SELECT id, status, latest_payload, latest_mime, payload_updated_at
    FROM parental_sessions
    WHERE device_id = ${deviceId}
      AND kind = ${kind}
    ORDER BY requested_at DESC
    LIMIT 1
  `;

  const session = rows[0] || null;
  return NextResponse.json({
    ok: true,
    session: session ? {
      id: session.id,
      status: session.status,
      dataBase64: session.latest_payload,
      mime: session.latest_mime,
      updatedAt: session.payload_updated_at,
    } : null,
  });
}
