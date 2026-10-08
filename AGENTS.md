# MetaBot CR — mandatory engineering rules for agents

## Source of truth
Read docs/METABOT_WORK_MASTER_PROMPT.md and docs/METABOT_WATI_PARITY_AUDIT.md before architectural decisions. Reuse existing Next.js/TypeScript/Prisma architecture; NEVER rebuild the app without necessity.

## Required task process
1. Inspect branch, git status, affected routes, authorization boundaries and regression scope.
2. Read the matching Skill in skills/*/SKILL.md (multiple skills may apply).
3. Define user-visible behavior, backend integration, persistence, error states and acceptance tests.
4. Implement on a feature branch. Small, reviewable commits. Never modify production, send real messages, publish campaigns, incur costs or migrate production data without explicit approval.
5. Test according to risk; report exact results. Never fabricate success or call a partial implementation complete.
6. Document blocked external APIs or credentials separately. No secrets or real customer data in GitHub.

## Skill routing
- Authentication, secrets, webhook, permissions, isolation and payments: skills/security/SKILL.md.
- Full-stack code, Prisma, services, workers, UI and integrations: skills/fullstack/SKILL.md.
- Automated tests, CI, regression, accessibility and release: skills/quality/SKILL.md.
- Marketing, onboarding, conversion, forms, pricing, SEO and mobile UX: skills/marketing-ux/SKILL.md.

## Zero-decoys
Every visible button and action must function or show an honest disabled/block state; no fake real-world data, fake testimonials, false production statuses, unpersisted forms or decorative pseudo-features. Synthetic demo data must be labeled.

## Security invariants
- Tenant users cannot access another business.
- The current operator login is Preview/local ONLY and not end-customer login.
- Do not enable WhatsApp in Production without tests and approval.
- Consent, validation, encryption, least privilege, idempotency and replays must be verified before shipping.
- A passing build is NOT production readiness.

## Per-iteration output
Exact commits/PR; changes and functionality; tests actually executed and evidence; known gaps, external steps, costs, and evidence-based DONE/PARTIAL/BLOCKED. No merge or deployment without approval.
