import { NextRequest, NextResponse } from "next/server";
import { createCatalogBusinessScope } from "@/lib/catalog/admin-session";
import { assertBusinessExists, assertCatalogAdmin } from "@/lib/catalog/security";

export async function POST(request: NextRequest) {
  try {
    await assertCatalogAdmin();
    const body = (await request.json()) as { businessId?: string };
    const businessId = body.businessId?.trim() ?? "";
    if (!businessId) {
      return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    }

    const business = await assertBusinessExists(businessId);
    await createCatalogBusinessScope(businessId);

    return NextResponse.json({ business });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo seleccionar la empresa." },
      { status },
    );
  }
}
