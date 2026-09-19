import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogAdmin } from "@/lib/catalog/security";

export async function GET() {
  try {
    await assertCatalogAdmin();
    const businesses = await db.business.findMany({
      where: { status: "active" },
      select: { id: true, name: true, country: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ businesses });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las empresas." },
      { status },
    );
  }
}
