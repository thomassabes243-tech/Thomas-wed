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
      include: { botConfig: true },
    });

    if (!business) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
    return NextResponse.json({ business });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la configuración." },
      { status },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const businessId = String(body.businessId ?? "").trim();
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);

    const stringOrNull = (value: unknown) => {
      const normalized = String(value ?? "").trim();
      return normalized || null;
    };

    const business = await db.business.update({
      where: { id: businessId },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() || "Negocio" } : {}),
        ...(body.type !== undefined ? { type: stringOrNull(body.type) } : {}),
        ...(body.description !== undefined ? { description: stringOrNull(body.description) } : {}),
        ...(body.address !== undefined ? { address: stringOrNull(body.address) } : {}),
        ...(body.phoneNumber !== undefined ? { phoneNumber: stringOrNull(body.phoneNumber) } : {}),
        ...(body.country !== undefined ? { country: stringOrNull(body.country) } : {}),
      },
    });

    const botConfig = await db.botConfig.upsert({
      where: { businessId },
      update: {
        ...(body.systemInstructions !== undefined ? { systemInstructions: String(body.systemInstructions) } : {}),
        ...(body.tone !== undefined ? { tone: String(body.tone).trim() || "amable y breve" } : {}),
        ...(body.welcomeMessage !== undefined ? { welcomeMessage: String(body.welcomeMessage) } : {}),
        ...(body.fallbackMessage !== undefined ? { fallbackMessage: String(body.fallbackMessage) } : {}),
        ...(body.humanHandoffMessage !== undefined ? { humanHandoffMessage: String(body.humanHandoffMessage) } : {}),
        ...(body.botActive !== undefined ? { active: Boolean(body.botActive) } : {}),
      },
      create: {
        businessId,
        systemInstructions: String(body.systemInstructions ?? ""),
        tone: String(body.tone ?? "amable y breve"),
        welcomeMessage: String(body.welcomeMessage ?? "Hola, ¿en qué podemos ayudarte?"),
        fallbackMessage: String(body.fallbackMessage ?? "No tengo esa información registrada. Puedo pasar tu consulta al negocio."),
        humanHandoffMessage: String(body.humanHandoffMessage ?? "Voy a pasar tu consulta a una persona del negocio."),
        active: body.botActive === false ? false : true,
      },
    });

    return NextResponse.json({ business, botConfig });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la configuración." },
      { status },
    );
  }
}
