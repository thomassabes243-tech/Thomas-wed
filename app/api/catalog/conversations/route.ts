import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogBusinessAccess } from "@/lib/catalog/security";

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")?.trim() ?? "";
    if (!businessId) return NextResponse.json({ error: "businessId requerido." }, { status: 400 });
    await assertCatalogBusinessAccess(businessId);

    const conversations = await db.conversation.findMany({
      where: { businessId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        customer: { select: { id: true, name: true, whatsappNumber: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
          select: { id: true, direction: true, content: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las conversaciones." },
      { status },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      conversationId?: string;
      action?: "take" | "release" | "close";
    };
    const businessId = body.businessId?.trim() ?? "";
    const conversationId = body.conversationId?.trim() ?? "";
    if (!businessId || !conversationId || !body.action) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    await assertCatalogBusinessAccess(businessId);
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, businessId },
    });
    if (!conversation) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });

    const updated = await db.conversation.update({
      where: { id: conversationId },
      data:
        body.action === "close"
          ? { status: "closed", assignedToHuman: false }
          : body.action === "take"
            ? { status: "human_required", assignedToHuman: true }
            : { status: "open", assignedToHuman: false },
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la conversación." },
      { status },
    );
  }
}
