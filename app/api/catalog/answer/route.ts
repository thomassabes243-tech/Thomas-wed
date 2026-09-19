import { NextRequest, NextResponse } from "next/server";
import { answerCatalogQuestion } from "@/lib/catalog/answer";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      query?: string;
    };

    const businessId = body.businessId?.trim() ?? "";
    const query = body.query?.trim() ?? "";

    if (!businessId || !query) {
      return NextResponse.json(
        { error: "businessId y query son requeridos." },
        { status: 400 },
      );
    }

    await assertCatalogBusinessAccess(businessId);
    const result = await answerCatalogQuestion({ businessId, query });

    return NextResponse.json(result);
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar el catálogo." },
      { status },
    );
  }
}
