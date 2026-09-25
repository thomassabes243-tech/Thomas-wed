import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";
import { buildProductSearchText } from "@/lib/catalog/normalize";

function nullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

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

function nullableBoolean(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const businessId = String(body.businessId ?? "").trim();

    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);

    const current = await db.product.findFirst({ where: { id, businessId } });
    if (!current) return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 });

    const merged = {
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      externalCode: body.externalCode !== undefined ? nullableString(body.externalCode) : current.externalCode,
      sku: body.sku !== undefined ? nullableString(body.sku) : current.sku,
      category: body.category !== undefined ? nullableString(body.category) : current.category,
      description: body.description !== undefined ? nullableString(body.description) : current.description,
      presentation: body.presentation !== undefined ? nullableString(body.presentation) : current.presentation,
      unit: body.unit !== undefined ? nullableString(body.unit) : current.unit,
      serviceType: body.serviceType !== undefined ? nullableString(body.serviceType) : current.serviceType,
      location: body.location !== undefined ? nullableString(body.location) : current.location,
      duration: body.duration !== undefined ? nullableString(body.duration) : current.duration,
      capacity: body.capacity !== undefined ? intOrNull(body.capacity) : current.capacity,
      checkInTime: body.checkInTime !== undefined ? nullableString(body.checkInTime) : current.checkInTime,
      checkOutTime: body.checkOutTime !== undefined ? nullableString(body.checkOutTime) : current.checkOutTime,
      includes: body.includes !== undefined ? nullableString(body.includes) : current.includes,
      amenities: body.amenities !== undefined ? nullableString(body.amenities) : current.amenities,
      availabilityNote: body.availabilityNote !== undefined ? nullableString(body.availabilityNote) : current.availabilityNote,
      reservationRequired:
        body.reservationRequired !== undefined ? nullableBoolean(body.reservationRequired) : current.reservationRequired,
      cancellationPolicy:
        body.cancellationPolicy !== undefined ? nullableString(body.cancellationPolicy) : current.cancellationPolicy,
    };

    if (!merged.name) return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });

    const product = await db.product.update({
      where: { id },
      data: {
        ...merged,
        ...(body.price !== undefined ? { price: decimalOrNull(body.price) } : {}),
        ...(body.stock !== undefined ? { stock: decimalOrNull(body.stock) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
        searchText: buildProductSearchText([
          merged.name,
          merged.externalCode,
          merged.sku,
          merged.category,
          merged.description,
          merged.presentation,
          merged.unit,
          merged.serviceType,
          merged.location,
          merged.duration,
          merged.capacity !== null ? String(merged.capacity) : null,
          merged.includes,
          merged.amenities,
          merged.availabilityNote,
          merged.cancellationPolicy,
        ]),
      },
    });

    return NextResponse.json({
      product: {
        ...product,
        price: product.price?.toString() ?? null,
        stock: product.stock?.toString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar.";
    const conflict = /unique|Unique constraint/i.test(message);
    return NextResponse.json({ error: conflict ? "Ese SKU o código ya existe." : message }, { status: conflict ? 409 : 400 });
  }
}
