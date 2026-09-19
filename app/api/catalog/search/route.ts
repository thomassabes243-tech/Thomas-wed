import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog/search";
import { assertBusinessExists, assertCatalogAdmin } from "@/lib/catalog/security";

export async function POST(request: NextRequest) {
  try {
    await assertCatalogAdmin();
    const body = (await request.json()) as { businessId?: string; query?: string; limit?: number };
    const businessId = body.businessId?.trim() ?? "";
    const query = body.query?.trim() ?? "";

    if (!businessId || !query) {
      return NextResponse.json({ error: "businessId y query son requeridos." }, { status: 400 });
    }

    await assertBusinessExists(businessId);
    const products = await searchProducts({ businessId, query, limit: body.limit });

    return NextResponse.json({
      products: products.map((product) => ({
        ...product,
        price: product.price?.toString() ?? null,
        stock: product.stock?.toString() ?? null,
      })),
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo buscar el catálogo." },
      { status },
    );
  }
}
