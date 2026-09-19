import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")?.trim() ?? "";
    if (!businessId) {
      return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    }
    await assertCatalogBusinessAccess(businessId);

    const imports = await db.catalogImport.findMany({
      where: { businessId },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        mode: true,
        totalRows: true,
        importedRows: true,
        updatedRows: true,
        unchangedRows: true,
        rejectedRows: true,
        createdAt: true,
        completedAt: true,
        errorSummary: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ imports });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el historial." },
      { status },
    );
  }
}
