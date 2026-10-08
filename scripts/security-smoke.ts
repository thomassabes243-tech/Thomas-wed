import assert from "node:assert/strict";
import {
  OPERATOR_SESSION_TTL_MS,
  createAdminPasswordHash,
  issueBusinessScope,
  issueOperatorSession,
  operatorCredentialsConfigured,
  operatorPreviewAllowed,
  readOperatorSession,
  verifyAdminPassword,
  verifyBusinessScope,
} from "../lib/catalog/auth-core";

const secret = "separate-session-secret-for-test-only-at-least-32-characters";
const now = 1_700_000_000_000;
const hashed = createAdminPasswordHash("password-for-test-only", Buffer.alloc(16, 4));

assert.equal(verifyAdminPassword("password-for-test-only", hashed), true);
assert.equal(verifyAdminPassword("wrong-password", hashed), false);
assert.equal(verifyAdminPassword("password-for-test-only", "malformed"), false);

assert.equal(operatorPreviewAllowed({ NODE_ENV: "production", VERCEL_ENV: "production" }), false);
assert.equal(operatorPreviewAllowed({ NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
assert.equal(operatorPreviewAllowed({ NODE_ENV: "development" }), true);
assert.equal(operatorCredentialsConfigured({ NODE_ENV: "production", VERCEL_ENV: "production", CATALOG_SESSION_SECRET: secret, CATALOG_ADMIN_PASSWORD_SCRYPT: hashed }), false);
assert.equal(operatorCredentialsConfigured({ NODE_ENV: "production", VERCEL_ENV: "preview", CATALOG_SESSION_SECRET: secret, CATALOG_ADMIN_PASSWORD_SCRYPT: hashed }), true);
assert.equal(operatorCredentialsConfigured({ NODE_ENV: "development", CATALOG_SESSION_SECRET: "too short", CATALOG_ADMIN_PASSWORD_SCRYPT: hashed }), false);

const cookie = issueOperatorSession(secret, now);
const session = readOperatorSession(cookie, secret, now + 1000);
assert.ok(session);
assert.equal(readOperatorSession(cookie, "wrong-secret-but-its-length-is-still-32-characters", now + 1), null);
assert.equal(readOperatorSession(cookie.replace(/.$/, "X"), secret, now + 1), null);
assert.equal(readOperatorSession(cookie, secret, now + OPERATOR_SESSION_TTL_MS), null);
assert.equal(readOperatorSession(cookie, secret, now - 1), null);

const businessA = issueBusinessScope("business-A", session, secret);
assert.equal(verifyBusinessScope(businessA, "business-A", session, secret), true);
assert.equal(verifyBusinessScope(businessA, "business-B", session, secret), false);
const anotherSession = readOperatorSession(issueOperatorSession(secret, now), secret, now)!;
assert.equal(verifyBusinessScope(businessA, "business-A", anotherSession, secret), false);
assert.equal(verifyBusinessScope(businessA.replace(/.$/, "X"), "business-A", session, secret), false);
assert.equal(verifyBusinessScope(businessA, "business-A", null, secret), false);

console.log("PASS: password hashing, fail-closed preview guard, expiring random sessions, session-bound business scopes.");
