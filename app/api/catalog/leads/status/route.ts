import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCatalogAdmin } from "@/lib/catalog/security";
import { LeadStatus } from "@/lib/marketing/leads";

const RequestShape = z.object({
  id: z.string().min(1).max(100),
  status: LeadStatus,
});

export async function POST(request: NextRequest) {
  try {
    await assertCatalogAdmin();
    const data = await request.formData();
    const checked = RequestShape.safeParse({
      id: data.get("id"), status: data.get("status"),
    });
    if (!checked.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    const updated = await db.salesLead.updateMany({
      where: { id: checked.data.id },
      data: { status: checked.data.status },
    });
    if (!updated.count) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    return NextResponse.redirect(new URL("/catalog/leads", request.url), 303);
  } catch (error) {
    const status = (error as Error & {status?:number}).status ?? 500;
    return NextResponse.json({ error: status===401?"No autorizado.":"No se pudo actualizar." }, { status });
  }
}
