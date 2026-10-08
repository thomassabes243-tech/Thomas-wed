# MetaBot CR — hoja de ruta verificable

| Fase | Estado | Condición de salida |
| --- | --- | --- |
| 0 Auditoría y documentación | PARTIAL | Inventario exhaustivo de referencias/rutas y APIs |
| 1A Seguridad del acceso operador Preview | CI PASS PREVIOUS BRANCH | Hash, sesiones, alcance y Origin más pruebas |
| 1B Autenticación de clientes | PARTIAL: PREVIEW ONLY, NOT TESTED WITH REAL DB | Login por usuario/tenant, RBAC y E2E A/B |
| 1C WhatsApp fiable | NOT_STARTED | Idempotencia, retries, envíos seguros y pruebas sandbox |
| 2 Inbox, CRM y base de conocimiento | NOT_STARTED | Flujos persistentes con control humano |
| 3 Agentes IA y flujos automatizados | NOT_STARTED | Editor + motor ejecutor + límites y tests |
| 4 Marketing y campañas con opt-in | NOT_STARTED | Consentimiento, aprobación, medición |
| 5 Omnicanal e integraciones | NOT_STARTED | Conectores aprobados con pruebas |
| 6 Sitio premium y contratación | PARTIAL: LANDING + CAPTACIÓN EN CÓDIGO | Formulario, modelo de leads, panel y política preliminar; requiere migración, flag opt-in, anti-spam reforzado, E2E y revisión jurídica |
| 7 Pilotos y producción | BLOCKED | Integraciones autorizadas, E2E y revisión humana |

La meta de paridad con Wati NO indica que exista paridad hoy. Las funciones no probadas no se anuncian como finalizadas.
