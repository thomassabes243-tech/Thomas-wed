import { NextResponse } from "next/server";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getParentalDb();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });
  }
}
