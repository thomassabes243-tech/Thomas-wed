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

    const [
      business,
      activeProducts,
      inactiveProducts,
      imports,
      openConversations,
      humanRequired,
      totalConversations,
      webhookEvents,
      recentImports,
      categoryRows,
    ] = await Promise.all([
      db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          type: true,
          country: true,
          phoneNumber: true,
          address: true,
          whatsappConnectionStatus: true,
          botConfig: { select: { active: true } },
        },
      }),
      db.product.count({ where: { businessId, active: true } }),
      db.product.count({ where: { businessId, active: false } }),
      db.catalogImport.count({ where: { businessId } }),
      db.conversation.count({ where: { businessId, status: "open" } }),
      db.conversation.count({ where: { businessId, status: "human_required" } }),
      db.conversation.count({ where: { businessId } }),
      db.webhookEvent.count({ where: { businessId } }),
      db.catalogImport.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          filename: true,
          status: true,
          importedRows: true,
          updatedRows: true,
          rejectedRows: true,
          createdAt: true,
        },
      }),
      db.product.findMany({
        where: { businessId, active: true, category: { not: null } },
        select: { category: true },
      }),
    ]);

    const categories = Array.from(
      new Set(categoryRows.map((row) => row.category).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      business,
      metrics: {
        activeProducts,
        inactiveProducts,
        imports,
        openConversations,
        humanRequired,
        totalConversations,
        webhookEvents,
        categories: categories.length,
      },
      categories,
      recentImports,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el resumen." },
      { status },
    );
  }
}
