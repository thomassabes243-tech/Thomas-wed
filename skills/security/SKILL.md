---
name: metabot-security
description: Security-critical engineering of authentication, RBAC, tenant isolation, sessions, webhooks and user data.
---
# MetaBot security
Trigger for identity, role, tenant-scoped data, webhook, credential, message, campaign or payment changes.

1. Draw trust boundaries for platform operator versus tenant owner/admin/agent. Enforce access server-side on every query and mutation; never trust a businessId from browser.
2. Test users of business A cannot read/write/delete/send/export data for business B, even by changing URL/body identifiers.
3. Use independent random secrets, expiring/revocable sessions, scrypt/Argon2 password hashes, CSRF defenses, distributed rate limits, secure cookies and login throttling.
4. Verify Meta webhook signatures on raw payload and preserve idempotency and safe retry without duplicate outbound sends; redact PII.
5. No production activation, remote sending, billing or destructive migrations without explicit approval. Fail closed on missing keys and permissions.
6. Treat authentication shared by operators in Preview as temporary and never describe as customer auth.

Acceptance: threat model, positive/negative security tests, no hardcoded secrets, documented unresolved risks.
