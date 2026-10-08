---
name: metabot-quality
description: Automated QA, GitHub Actions, regression testing and safe release gates.
---
# MetaBot QA
Trigger for any code change, bug fix, quality review or readiness claim.

1. Identify affected user journeys, negative cases and known risks before coding.
2. Use deterministic synthetic tests; never pull real customer data or secrets into CI.
3. Check TypeScript, lint, build, unit/integration and appropriate E2E; two synthetic tenants for RBAC-sensitive code.
4. Negative cases include auth denial, IDOR, concurrent edits, webhook duplicates/retries and external service errors.
5. Prefer free GitHub Actions with minimum permissions and pinned reviewed actions. Do not auto-deploy production.
6. Report CI URLs and actual conclusions, never presume green from an unexecuted workflow.

Acceptance: verified tests, disclosed missing E2E or external authorizations, factual readiness status.
