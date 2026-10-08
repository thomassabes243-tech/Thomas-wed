import type { PrismaClient } from "@prisma/client";

export type InboxAction = "take" | "release" | "close" | "reopen";

export class InboxError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Atomic, tenant-aware updates, including collision protection for two agents. */
export async function applyConversationAction(
  client: Pick<PrismaClient, "businessUser" | "conversation">,
  params: {
    businessId: string;
    membershipId: string;
    conversationId: string;
    action: InboxAction;
  },
) {
  const { businessId, membershipId, conversationId, action } = params;
  if (!businessId || !membershipId || !conversationId ||
      businessId.length > 200 || conversationId.length > 200) {
    throw new InboxError(400, "Identificadores inválidos.");
  }
  const membership = await client.businessUser.findUnique({
    where: { id: membershipId }, select: { id: true, businessId: true, role: true },
  });
  if (!membership || membership.businessId !== businessId) {
    throw new InboxError(403, "No tenés acceso a esta empresa.");
  }
  const elevated = membership.role === "owner" || membership.role === "admin";
  const target = await client.conversation.findFirst({
    where: { id: conversationId, businessId }, select: { id: true },
  });
  if (!target) throw new InboxError(404, "Conversación no encontrada.");

  const currentlyActive = { in: ["open", "waiting", "human_required"] as Array<"open"|"waiting"|"human_required"> };
  if (action === "reopen" && !elevated) throw new InboxError(403, "Solo administración puede reabrir conversaciones.");

  const scope = { id: conversationId, businessId };
  let updated;
  switch (action) {
    case "take":
      updated = await client.conversation.updateMany({
        where: {
          ...scope,
          status: currentlyActive,
          OR: [{ assignedBusinessUserId: null }, { assignedBusinessUserId: membershipId }],
        },
        data: {
          assignedBusinessUserId: membershipId,
          assignedToHuman: true,
          status: "human_required",
        },
      });
      break;
    case "release":
      updated = await client.conversation.updateMany({
        where: {
          ...scope, status: currentlyActive,
          ...(!elevated ? { assignedBusinessUserId: membershipId } : {}),
        },
        data: { assignedBusinessUserId: null, assignedToHuman: false, status: "open" },
      });
      break;
    case "close":
      updated = await client.conversation.updateMany({
        where: {
          ...scope, status: currentlyActive,
          ...(!elevated ? { assignedBusinessUserId: membershipId } : {}),
        },
        data: { assignedBusinessUserId: null, assignedToHuman: false, status: "closed" },
      });
      break;
    case "reopen":
      updated = await client.conversation.updateMany({
        where: { ...scope, status: "closed" },
        data: { assignedBusinessUserId: null, assignedToHuman: false, status: "open" },
      });
      break;
    default:
      throw new InboxError(400, "Operación inválida.");
  }
  if (updated.count !== 1) {
    throw new InboxError(409,
      "La conversación cambió o está asignada a otro agente. Actualizá la página.");
  }
  return client.conversation.findFirst({
    where: scope,
    select: {
      id: true, businessId: true, status: true, assignedToHuman: true,
      assignedBusinessUserId: true, lastMessageAt: true,
    },
  });
}
