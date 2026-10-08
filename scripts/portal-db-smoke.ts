import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { authorizedPortalMembership } from "../lib/portal/access";

const uri = process.env.DATABASE_URL ?? "";
// Refuse to run against non-disposable databases.
if (process.env.PORTAL_TEST_DB !== "true" ||
    !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/metabot_portal_test(?:\?|$)/.test(uri)) {
  throw new Error("Only a disposable local metabot_portal_test database is allowed.");
}

async function main() {
const db = new PrismaClient();
const id = randomUUID().replaceAll("-", "");
const businessA = "qa-company-a-" + id;
const businessB = "qa-company-b-" + id;
const ownerA = "qa-owner-a-" + id;
const agentB = "qa-agent-b-" + id;
try {
  await db.business.createMany({
    data: [{ id: businessA, name: "A synthetic shop" }, { id: businessB, name: "B synthetic shop" }],
  });
  await db.user.createMany({
    data: [
      { id: ownerA, email: id + "a@example.invalid", passwordHash: "test-fixture" },
      { id: agentB, email: id + "b@example.invalid", passwordHash: "test-fixture" },
    ],
  });
  await db.businessUser.createMany({
    data: [
      { userId: ownerA, businessId: businessA, role: "owner" },
      { userId: agentB, businessId: businessB, role: "agent" },
    ],
  });
  await db.product.createMany({
    data: [
      { businessId: businessA, name: "Catalog A", searchText: "catalog a" },
      { businessId: businessB, name: "Catalog B", searchText: "catalog b" },
    ],
  });

  const accessA = await authorizedPortalMembership(db, ownerA, businessA, "read");
  assert.ok(accessA);
  assert.equal(accessA.business.id, businessA);
  assert.equal((await db.product.findFirst({ where: { businessId: accessA.business.id } }))?.name, "Catalog A");
  assert.equal(await authorizedPortalMembership(db, ownerA, businessB, "read"), null);
  assert.equal(await authorizedPortalMembership(db, agentB, businessA, "read"), null);
  assert.ok(await authorizedPortalMembership(db, agentB, businessB, "read"));
  assert.equal(await authorizedPortalMembership(db, agentB, businessB, "manage"), null);
  assert.equal(await authorizedPortalMembership(db, agentB, businessB, "invite"), null);
  assert.ok(await authorizedPortalMembership(db, ownerA, businessA, "manage"));

  await db.business.update({ where: { id: businessA }, data: { status: "inactive" } });
  assert.equal(await authorizedPortalMembership(db, ownerA, businessA, "read"), null);
  console.log("PASS: two-business database test prevents foreign tenant reads, role privilege and inactive access.");
} finally {
  await db.business.deleteMany({ where: { id: { in: [businessA, businessB] } } });
  await db.user.deleteMany({ where: { id: { in: [ownerA, agentB] } } });
  await db.$disconnect();
}

}

main().catch(error => { console.error(error); process.exitCode = 1; });
