import { NextRequest, NextResponse } from "next/server";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";
import { processInboundMessage } from "@/lib/bot/process-inbound";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      message?: string;
      customerNumber?: string;
      customerName?: string;
    };

    const businessId = body.businessId?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    if (!businessId || !message) {
      return NextResponse.json({ error: "businessId y message son requeridos." }, { status: 400 });
    }

    await assertCatalogBusinessAccess(businessId);

    const result = await processInboundMessage({
      businessId,
      from: body.customerNumber?.trim() || "preview-customer",
      customerName: body.customerName?.trim() || "Cliente de prueba",
      text: message,
      sendToWhatsApp: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo simular el mensaje." },
      { status },
    );
  }
}
