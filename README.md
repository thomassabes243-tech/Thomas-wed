# MetaBot CR

MVP SaaS multi-tenant para conectar negocios de Costa Rica con WhatsApp Business Cloud API. Incluye una página comercial, dashboard móvil de muestra, simulador sin costos, motor de respuestas determinista y base segura para el webhook oficial de Meta.

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Con `DEMO_MODE=true` no se envía ningún mensaje real ni se llama a servicios pagados.

## Base de datos

El esquema está en `prisma/schema.prisma`. Antes de aplicar cualquier migración, confirme que `DATABASE_URL` pertenece exclusivamente al proyecto Neon de MetaBot CR. Nunca copie secretos a GitHub.

```bash
npx prisma generate
npx prisma db push
```

## Conexión futura con Meta

1. Configure una aplicación empresarial en Meta Developers y agregue WhatsApp.
2. Añada las variables de `.env.example` directamente en Vercel.
3. Use `/api/webhooks/whatsapp` como callback.
4. Configure el mismo `WHATSAPP_VERIFY_TOKEN` en Meta y Vercel.
5. Configure `META_APP_SECRET` para validar la firma de eventos.
6. Mantenga `DEMO_MODE=true` hasta completar una prueba controlada con el número de prueba.

No se deben usar WhatsApp Web, scraping ni credenciales hardcodeadas. El consumo de plantillas de Meta y del proveedor de IA puede generar costos cuando se active el modo real.

## Estado del MVP

El demo funciona sin credenciales. La persistencia real, autenticación Better Auth y procesamiento completo de mensajes quedan bloqueados hasta configurar de forma segura `DATABASE_URL`, secretos de autenticación y credenciales del número de prueba de Meta.
