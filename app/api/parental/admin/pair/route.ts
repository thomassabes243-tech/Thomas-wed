import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest, sha256 } from "@/lib/parental/security";
import { getParentalDb } from "@/lib/parental/db";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const input = schema.parse(await request.json());
    const db = getParentalDb();
    const codeHash = sha256(input.code);

    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM parental_devices
      WHERE pairing_code_hash = ${codeHash}
        AND pairing_expires_at > NOW()
        AND paired = FALSE
      LIMIT 1
    `;

    const device = rows[0];
    if (!device) {
      return NextResponse.json({ ok: false, error: "invalid_or_expired_code" }, { status: 404 });
    }

    await db.$executeRaw`
      UPDATE parental_devices
      SET paired = TRUE,
          pairing_code_hash = NULL,
          pairing_expires_at = NULL,
          updated_at = NOW()
      WHERE id = ${device.id}
    `;

    return NextResponse.json({ ok: true, deviceId: device.id });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }
}
