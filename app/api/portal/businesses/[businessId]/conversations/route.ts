import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePortalBusiness } from "@/lib/portal/auth";
import { applyConversationAction, InboxError } from "@/lib/portal/inbox";

const updateBody = z.object({
  conversationId: z.string().min(1).max(200),
  action: z.enum(["take", "release", "close", "reopen"]),
}).strict();

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, {
    status, headers: { "Cache-Control": "no-store" },
  });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    await requirePortalBusiness(businessId, "read");
    const raw = request.nextUrl.searchParams.get("status");
    const allowed = ["open", "waiting", "human_required", "closed"] as const;
    const status = allowed.find(s => s === raw);
    const conversations = await db.conversation.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { lastMessageAt: "desc" }, take: 50,
      select: {
        id: true, status: true, priority: true, assignedToHuman: true,
        assignedBusinessUserId: true, lastMessageAt: true,
        assignedBusinessUser: {
          select: { user: { select: { name: true, email: true } } },
        },
        customer: {
          select: { name: true, whatsappNumber: true },
        },
        messages: {
          orderBy: { createdAt: "desc" }, take: 20,
          select: { id: true, direction: true, content: true, createdAt: true },
        },
      },
    });
    return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return errorResponse(status === 500 ? "No fue posible cargar conversaciones." :
      error instanceof Error ? error.message : "No autorizado.", status);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    const { membership } = await requirePortalBusiness(businessId, "handle");
    const input = updateBody.safeParse(await request.json().catch(() => null));
    if (!input.success) return errorResponse("Acción o conversación inválida.", 400);
    const conversation = await applyConversationAction(db, {
      businessId, membershipId: membership.id,
      conversationId: input.data.conversationId, action: input.data.action,
    });
    return NextResponse.json({ conversation }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof InboxError ? error.status :
      (error as Error & { status?: number }).status ?? 500;
    return errorResponse(status === 500 ? "No se pudo actualizar la conversación." :
      error instanceof Error ? error.message : "No autorizado.", status);
  }
}
