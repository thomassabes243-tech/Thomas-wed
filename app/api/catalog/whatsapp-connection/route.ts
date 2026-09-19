import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")?.trim() ?? "";
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });

    await assertCatalogBusinessAccess(businessId);

    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        phoneNumber: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
      },
    });

    if (!business) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

    return NextResponse.json({
      connection: {
        phoneNumber: business.phoneNumber,
        phoneNumberId: business.whatsappPhoneNumberId,
        businessAccountId: business.whatsappBusinessAccountId,
        configured: Boolean(business.whatsappPhoneNumberId),
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la conexión." },
      { status },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      phoneNumber?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    };

    const businessId = body.businessId?.trim() ?? "";
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });

    await assertCatalogBusinessAccess(businessId);

    const clean = (value?: string) => value?.trim() || null;

    const business = await db.business.update({
      where: { id: businessId },
      data: {
        phoneNumber: clean(body.phoneNumber),
        whatsappPhoneNumberId: clean(body.phoneNumberId),
        whatsappBusinessAccountId: clean(body.businessAccountId),
      },
      select: {
        id: true,
        phoneNumber: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
      },
    });

    return NextResponse.json({
      connection: {
        phoneNumber: business.phoneNumber,
        phoneNumberId: business.whatsappPhoneNumberId,
        businessAccountId: business.whatsappBusinessAccountId,
        configured: Boolean(business.whatsappPhoneNumberId),
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la conexión." },
      { status },
    );
  }
}
