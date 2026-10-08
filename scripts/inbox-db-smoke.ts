import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { applyConversationAction, InboxError } from "../lib/portal/inbox";
import { portalRoleAllows } from "../lib/portal/auth-core";

if (process.env.PORTAL_TEST_DB !== "true" ||
  !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/metabot_portal_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Inbox test only runs against disposable localhost/metabot_portal_test.");
}
const id = randomUUID().replaceAll("-", "");
const companyA = "inbox-a-" + id;
const companyB = "inbox-b-" + id;
const ownerUser = "inbox-owner-" + id, agent1User = "inbox-1-" + id,
  agent2User = "inbox-2-" + id, foreignUser = "inbox-foreign-" + id;
const ownerId = "member-owner-" + id, a1Id = "member-1-" + id,
  a2Id = "member-2-" + id, foreignId = "member-foreign-" + id;

async function expectStatus(status: number, fn: () => Promise<unknown>) {
  try {
    await fn();
    assert.fail("Expected an inbox access violation.");
  } catch (error) {
    assert.ok(error instanceof InboxError);
    assert.equal(error.status, status);
  }
}
async function main() {
  await db.business.createMany({ data: [
    { id: companyA, name: "Inbox A" }, { id: companyB, name: "Inbox B" },
  ] });
  await db.user.createMany({ data: [
    { id: ownerUser, email: id + "owner@example.invalid" },
    { id: agent1User, email: id + "agent1@example.invalid" },
    { id: agent2User, email: id + "agent2@example.invalid" },
    { id: foreignUser, email: id + "foreign@example.invalid" },
  ] });
  await db.businessUser.createMany({ data: [
    { id: ownerId, userId: ownerUser, businessId: companyA, role: "owner" },
    { id: a1Id, userId: agent1User, businessId: companyA, role: "agent" },
    { id: a2Id, userId: agent2User, businessId: companyA, role: "agent" },
    { id: foreignId, userId: foreignUser, businessId: companyB, role: "agent" },
  ] });
  try {
    assert.equal(portalRoleAllows("agent", "handle"), true);
    assert.equal(portalRoleAllows("agent", "manage"), false);
    const customer = await db.customer.create({
      data: { businessId: companyA, whatsappNumber: "+50688885555" },
    });
    const conversation = await db.conversation.create({
      data: { businessId: companyA, customerId: customer.id },
    });
    const base = { businessId: companyA, conversationId: conversation.id };
    await expectStatus(403, () =>
      applyConversationAction(db, { ...base, membershipId: foreignId, action: "take" }));
    assert.equal((await applyConversationAction(db, { ...base, membershipId: a1Id, action: "take" }))?.assignedBusinessUserId, a1Id);
    await expectStatus(409, () =>
      applyConversationAction(db, { ...base, membershipId: a2Id, action: "take" }));
    await expectStatus(409, () =>
      applyConversationAction(db, { ...base, membershipId: a2Id, action: "close" }));
    assert.equal((await applyConversationAction(db, { ...base, membershipId: a1Id, action: "release" }))?.status, "open");
    assert.equal((await applyConversationAction(db, { ...base, membershipId: a2Id, action: "take" }))?.assignedBusinessUserId, a2Id);
    const closed = await applyConversationAction(db, { ...base, membershipId: ownerId, action: "close" });
    assert.equal(closed?.status, "closed");
    assert.equal(closed?.assignedBusinessUserId, null);
    await expectStatus(403, () =>
      applyConversationAction(db, { ...base, membershipId: a1Id, action: "reopen" }));
    assert.equal((await applyConversationAction(db, { ...base, membershipId: ownerId, action: "reopen" }))?.status, "open");
    assert.equal((await db.conversation.findMany({ where: { businessId: companyB } })).length, 0);
    console.log("PASS: tenant isolation, agent assignment conflicts, role-aware release/close and owner-only reopen.");
  } finally {
    await db.business.deleteMany({ where: { id: { in: [companyA, companyB] } } });
    await db.user.deleteMany({
      where: { id: { in: [ownerUser, agent1User, agent2User, foreignUser] } },
    });
    await db.$disconnect();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
