import { NextRequest, NextResponse } from "next/server";
import { PortalProductInput } from "@/lib/portal/product-input";
import { db } from "@/lib/db";
import { requirePortalBusiness } from "@/lib/portal/auth";
import { buildProductSearchText } from "@/lib/catalog/normalize";

function failed(err: unknown) {
  const status = (err as Error & { status?: number })?.status ?? 500;
  return NextResponse.json({
    error: status >= 500 ? "No se pudo procesar la solicitud." :
      err instanceof Error ? err.message : "Solicitud inválida.",
  }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    await requirePortalBusiness(businessId, "read");
    const take = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 25));
    const products = await db.product.findMany({
      where: { businessId, active: true },
      orderBy: { name: "asc" }, take,
      select: { id: true, name: true, category: true, description: true, price: true },
    });
    return NextResponse.json({
      products: products.map(p => ({ ...p, price: p.price?.toString() ?? null })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) { return failed(err); }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    await requirePortalBusiness(businessId, "manage");
    const body = PortalProductInput.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Revisá el nombre y precio del producto." }, { status: 400 });
    const { name, category, description, price } = body.data;
    const product = await db.product.create({
      data: {
        businessId, name,
        category: category || null, description: description || null,
        price: price ? price : null,
        searchText: buildProductSearchText([name, category, description]),
        active: true,
      },
      select: { id: true, name: true, category: true, price: true },
    });
    return NextResponse.json({
      product: { ...product, price: product.price?.toString() ?? null },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) { return failed(err); }
}
