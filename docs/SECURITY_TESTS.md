# MetaBot CR — pruebas de seguridad y límites

## Comprobaciones automatizadas propuestas
- scripts/security-smoke.ts: hash correcto/incorrecto de scrypt, Preview fail-closed, sesión firmada alterada/vencida/futura, alcance de empresa ligado a sesión y rechazo de otros Origin.
- npm run test:security: ejecuta smoke sin DB ni credenciales.
- .github/workflows/metabot-security-validation.yml: npm ci, Prisma generate, typecheck, ESLint, security smoke, catalog smoke y next build.

Consultar el RUN real de Actions antes de declarar pruebas PASS. El workflow por sí solo no acredita éxito.

## Pruebas pendientes
- Login multiusuario y permisos reales por BusinessUser.
- E2E con dos empresas y ataques de sustitución de businessId.
- Pruebas de mensajería webhook y retries, con instancia y número de sandbox.
- CSRF E2E con dominio protegido y proxy de Vercel.
- Limitador de intentos distribuido, protección de borde y penetración.
- Copias de seguridad y restauración.

## Seguridad de despliegue
No modificar producción ni iniciar envíos. Para Preview configurar secrets solamente mediante el proveedor. No comprometer secretos en commits ni logs.
