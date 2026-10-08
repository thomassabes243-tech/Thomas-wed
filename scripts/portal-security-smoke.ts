import { PortalProductInput } from "../lib/portal/product-input";
import assert from "node:assert/strict";
import {
  canInvitePortalRole,
  isPortalToken,
  isStrongPortalPassword,
  normalizePortalEmail,
  portalRoleAllows,
  portalToken,
  portalTokenHash,
} from "../lib/portal/auth-core";

assert.equal(normalizePortalEmail("  Test@Example.COM "), "test@example.com");
for (const invalid of ["", "x", "no-at-sign", "invalid @ example.com", 42, null]) {
  assert.equal(normalizePortalEmail(invalid), null);
}
assert.equal(isStrongPortalPassword("0123456789Ab"), true);
assert.equal(isStrongPortalPassword("short"), false);
assert.equal(isStrongPortalPassword("x".repeat(129)), false);
const a = portalToken(), b = portalToken();
assert.equal(isPortalToken(a), true);
assert.equal(isPortalToken(b), true);
assert.notEqual(a, b);
assert.equal(portalTokenHash(a), portalTokenHash(a));
assert.notEqual(portalTokenHash(a), portalTokenHash(b));
assert.equal(isPortalToken("not-an-invitation-token"), false);
assert.equal(portalRoleAllows("owner", "invite"), true);
assert.equal(portalRoleAllows("admin", "invite"), true);
assert.equal(portalRoleAllows("agent", "invite"), false);
assert.equal(portalRoleAllows("agent", "read"), true);
assert.equal(portalRoleAllows("agent", "manage"), false);
assert.equal(canInvitePortalRole("owner", "owner"), true);
assert.equal(canInvitePortalRole("admin", "owner"), false);
assert.equal(canInvitePortalRole("admin", "admin"), false);
assert.equal(canInvitePortalRole("admin", "agent"), true);
assert.equal(canInvitePortalRole("agent", "agent"), false);

// Real validation contract used by the authenticated product endpoint.
assert.equal(PortalProductInput.safeParse({ name: "Taza", price: "3500.00" }).success, true);
assert.equal(PortalProductInput.safeParse({ name: "  " }).success, false);
assert.equal(PortalProductInput.safeParse({ name: "Taza", price: "-1" }).success, false);
assert.equal(PortalProductInput.safeParse({ name: "Taza", price: "12.999" }).success, false);
assert.equal(PortalProductInput.safeParse({ name: "Taza", businessId: "another-company" }).success, false);

console.log("PASS: portal input validation, invitation token uniqueness, role authorization and invitation rules.");
