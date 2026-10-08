---
name: metabot-fullstack
description: Build production-quality features through Next.js, React, TypeScript, Prisma, Node and Meta APIs.
---
# MetaBot full-stack
Trigger for UI, API, schema, worker or integration feature.

1. Reuse App Router, current database models, components and APIs; do not rebuild.
2. Deliver vertical slices: UI -> validation -> authenticated API -> service logic -> durable state -> honest UI response -> tests.
3. Scope all reads and writes to authorized tenant identity; backward-compatible migrations and indexes.
4. Use only official authenticated channel APIs and server-only secrets. If credentials absent, produce a contract and explicit BLOCKED state, not a fake connection.
5. Keep WhatsApp production lockout until Meta end-to-end approval.
6. Test loading/success/error/retry/permission states on mobile.

Acceptance: a genuine behavior with backend and persistence, tests and traceable commit. No empty buttons.
