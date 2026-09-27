import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getParentalDb } from "@/lib/parental/db";
import { authenticateDevice, randomId, redactSensitive } from "@/lib/parental/security";

export const runtime = "nodejs";

const schema = z.object({
  appName: z.string().trim().min(1).max(120),
  title: z.string().max(600).nullable().optional(),
  body: z.string().max(1200).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) return NextResponse.json({ ok: false }, { status: 401 });
  if (!device.paired) return NextResponse.json({ ok: false, error: "not_paired" }, { status: 403 });

  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();
    await db.$executeRaw`
      INSERT INTO parental_notifications
      (id, device_id, app_name, title, body, created_at)
      VALUES
      (${randomId()}, ${device.id}, ${input.appName}, ${redactSensitive(input.title)}, ${redactSensitive(input.body)}, NOW())
    `;
    await db.$executeRaw`
      UPDATE parental_devices SET last_seen_at = NOW(), updated_at = NOW() WHERE id = ${device.id}
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_notification" }, { status: 400 });
  }
}
