# MetaBot CR — arquitectura y límites confirmados

## Aplicación existente
- Next.js App Router + TypeScript/React y Prisma con PostgreSQL/Neon.
- Página comercial y demostración con motor de reglas en app/page.tsx y app/api/demo/chat.
- Centro de catálogos en /catalog, importación CSV/XLSX, dashboard y conversaciones.
- Tablas Business, BusinessUser, User, Product, Customer, Conversation, Message, BotConfig y WebhookEvent.
- Código para integrar WhatsApp Cloud API, intencionalmente limitado a Preview/desarrollo.

## Borde de seguridad que introduce esta rama
La autenticación temporal del operador en Preview emplea hash scrypt, secreto de sesión independiente, cookie de sesión aleatoria firmada con vencimiento de ocho horas, alcance de negocio ligado a esa sesión y validación de Origin para escrituras de /api/catalog.

Esto NO es autenticación por usuario/cliente. El operador aún puede gestionar todas las empresas desde Preview. La arquitectura futura requiere User + BusinessUser con identidad individual, invitaciones, recuperación, roles, revocación y pruebas de dos empresas.

## Próximo diseño seguro
1. Autenticación por usuario y RBAC por empresa en todos los servicios y consultas.
2. Webhook idempotente y colas durables con manejo de mensajes failed y garantías contra doble respuesta.
3. Bandeja compartida, intervención humana real, respuestas sobre datos confirmados y métricas verdaderas.
4. CRM, constructor de automatizaciones, campañas con consentimiento y conectores oficiales.
5. Página comercial con flujo real de prueba y contratación, sin anunciar funciones no terminadas.

## Alcance y límite de esta entrega
No hay migración ni conexión de base nueva, credenciales Meta ni prueba de mensajería real. No hay despliegue verificado ni capacidad de clientes multiempresa de producción. El smoke test criptográfico no reemplaza un pentest.
