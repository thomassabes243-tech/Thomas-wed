import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";
import { buildProductSearchText } from "@/lib/catalog/normalize";

function decimalOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Valor numérico inválido.");
  return new Prisma.Decimal(parsed);
}

function intOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Capacidad inválida.");
  return parsed;
}

function nullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function nullableBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function searchTextFrom(input: Record<string, unknown>) {
  return buildProductSearchText([
    nullableString(input.name),
    nullableString(input.externalCode),
    nullableString(input.sku),
    nullableString(input.category),
    nullableString(input.description),
    nullableString(input.presentation),
    nullableString(input.unit),
    nullableString(input.serviceType),
    nullableString(input.location),
    nullableString(input.duration),
    nullableString(input.includes),
    nullableString(input.amenities),
    nullableString(input.availabilityNote),
    nullableString(input.cancellationPolicy),
    input.capacity ? String(input.capacity) : null,
  ]);
}

function serialize(product: {
  id: string;
  externalCode: string | null;
  sku: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: Prisma.Decimal | null;
  stock: Prisma.Decimal | null;
  presentation: string | null;
  unit: string | null;
  serviceType: string | null;
  location: string | null;
  duration: string | null;
  capacity: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  includes: string | null;
  amenities: string | null;
  availabilityNote: string | null;
  reservationRequired: boolean | null;
  cancellationPolicy: string | null;
  active: boolean;
}) {
  return {
    ...product,
    price: product.price?.toString() ?? null,
    stock: product.stock?.toString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")?.trim() ?? "";
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = request.nextUrl.searchParams.get("category")?.trim() ?? "";
    const status = request.nextUrl.searchParams.get("status") ?? "active";

    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);

    const products = await db.product.findMany({
      where: {
        businessId,
        ...(status === "all" ? {} : { active: status !== "inactive" }),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { externalCode: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { searchText: { contains: buildProductSearchText([q]) } },
              ],
            }
          : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      take: 200,
      select: {
        id: true,
        externalCode: true,
        sku: true,
        name: true,
        category: true,
        description: true,
        price: true,
        stock: true,
        presentation: true,
        unit: true,
        serviceType: true,
        location: true,
        duration: true,
        capacity: true,
        checkInTime: true,
        checkOutTime: true,
        includes: true,
        amenities: true,
        availabilityNote: true,
        reservationRequired: true,
        cancellationPolicy: true,
        active: true,
      },
    });

    return NextResponse.json({ products: products.map(serialize) });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el catálogo." },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const businessId = String(body.businessId ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!businessId || !name) {
      return NextResponse.json({ error: "businessId y nombre son requeridos." }, { status: 400 });
    }

    await assertCatalogBusinessAccess(businessId);

    const data = {
      businessId,
      externalCode: nullableString(body.externalCode),
      sku: nullableString(body.sku),
      name,
      category: nullableString(body.category),
      description: nullableString(body.description),
      price: decimalOrNull(body.price),
      stock: decimalOrNull(body.stock),
      presentation: nullableString(body.presentation),
      unit: nullableString(body.unit),
      serviceType: nullableString(body.serviceType),
      location: nullableString(body.location),
      duration: nullableString(body.duration),
      capacity: intOrNull(body.capacity),
      checkInTime: nullableString(body.checkInTime),
      checkOutTime: nullableString(body.checkOutTime),
      includes: nullableString(body.includes),
      amenities: nullableString(body.amenities),
      availabilityNote: nullableString(body.availabilityNote),
      reservationRequired: nullableBoolean(body.reservationRequired),
      cancellationPolicy: nullableString(body.cancellationPolicy),
      active: body.active === false ? false : true,
      searchText: searchTextFrom({ ...body, name }),
    };

    const product = await db.product.create({ data });

    return NextResponse.json({
      product: serialize(product),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el servicio.";
    const conflict = /unique|Unique constraint/i.test(message);
    return NextResponse.json({ error: conflict ? "Ese SKU o código ya existe." : message }, { status: conflict ? 409 : 400 });
  }
}
