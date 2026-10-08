# MetaBot CR — auditoría y matriz de capacidades de referencia
Actualizada: 2026-10-08 (fuentes públicas, código GitHub consultado).

## Fuente actual y límite
Rama existente: feature/catalog-importer, HEAD baa2cda756a14405ef691a33873a65f610f0f4ef (2026-09-25).
Repositorio: https://github.com/thomassabes243-tech/Thomas-wed/tree/feature/catalog-importer
GitHub Actions: https://github.com/thomassabes243-tech/Thomas-wed/actions/runs/36077288454 (success).
Vercel conexión accesible actualmente: proyectos clipforge y clip-thomas; MetaBot/thomas-web no visible desde esta conexión. No se verificó despliegue ni conectividad real de Meta.
Referencias: https://www.wati.io/es/ ; https://www.wati.io/es/pricing-comparison/ ; https://support.wati.io/es/articles/11375155-descripcion-general-de-wati-funciones-canales-e-integraciones ; https://respond.io/es/ai-agents
No copiar textos, marca, estilo exacto, activos ni código de terceros.

## Estado por módulo
| Módulo | Evidencia | Estado auditado |
| --- | --- | --- |
| Página comercial | app/page.tsx con secciones, demo y CTA de contacto | Implementada en código; despliegue no comprobado |
| Demo | app/api/demo/chat, lib/ai/rules.ts | Reglas simuladas, no asistente LLM |
| Multiempresa | prisma Business, BusinessUser, User, BotConfig | Esquema existe; roles de login empresarial incompletos |
| Seguridad de sesión | lib/catalog/admin-session.ts | Provisional, secreto admin compartido y comportamiento preview |
| Catálogo CSV/XLSX | /api/catalog/preview/import, lib/catalog/parser.ts, migraciones | Módulo de código y smoke test con 1500 filas |
| Chats | /api/catalog/conversations, process-inbound | Persistencia/gestión básica; falta e2e real |
| WhatsApp | /api/webhooks/whatsapp, lib/meta/*, whatsapp-setup | Preview only; Meta y número real no verificados |
| Retries webhook | webhookEvent por message id y duplicate check | Riesgo: failed queda bloqueado por deduplicación simple |
| IA generativa | rules/answer catalog | No conectada al bot real |
| CRM avanzado | Customer y Conversation | Contactos básicos; pipeline/tasks/score pendientes |
| Campañas/plantillas | Sin evidencia funcional en árbol | Pendiente |
| Flujos visuales | Sin evidencia funcional en árbol | Pendiente |
| Análisis | dashboard stats básicas y calculadora de hipótesis | Parcial, no medir ventas falsas |
| Multicanal | No adaptadores Instagram/Messenger/SMS/TikTok verificados | Pendiente |
| Pagos/reservas reales | No confirmado sistema transaccional | Pendiente |
| Ready for paying clients | No pruebas de producción ni credenciales Meta | NO |

## Cobertura funcional de referencia (paráfrasis original)
1. Marketing: anuncios que abren chat, enlaces QR, captura de formularios/contactos/redes, atribución, segmentos, campañas, retargeting y medición.
2. Ventas: calificación y puntuación de prospectos, enrutamiento, pipeline, tareas/seguimiento, checkout/enlaces de pago condicionados por país.
3. Soporte: agentes IA de conocimiento, escalación, equipo compartido, contexto, notas, tiempos de resolución, CSAT.
4. Canales: WhatsApp texto/llamadas según API, Instagram DM/comentarios/stories, Messenger, webchat, TikTok, SMS/RCS donde proveedor lo habilite.
5. IA: constructor de agentes, asistente de agente humano, redacción, resumen, traducción, etiquetas, analítica de calidad.
6. Workflow sin código: triggers, condiciones, preguntas, espera, webhooks, plantillas, ramas, tags, asignaciones, simulador.
7. Inbox: asignaciones, estados, filtros, notas, etiquetas, auditoría, historial, uso móvil, media autorizada.
8. Múltiples números y equipos: scopes por negocio, separación regional, roles.
9. Grupos de WhatsApp: solo con permiso/API oficial y acceso verificado.
10. CRM, ventas y catálogo: Kanban, clientes, sincronizaciones, catálogo, pedidos.
11. Retención: plantillas transaccionales, recordatorios, campañas con opt-in y bajas.
12. Estadísticas: analítica de campañas, mensajes, agentes, origen de leads, atribución y costes.
13. Integraciones: API/webhooks, Salesforce, HubSpot, Zoho, Shopify, WooCommerce, Google Sheets, Make, Zapier, n8n y otras según permisos.
14. Página comercial: navegación, demo, industrias, planes/precios, FAQs, formularios, soporte, confianza y legal.
15. SaaS: suscripciones, presupuestos, metering por tenant, seguridad, auditoría, exportación.

## Riesgos a corregir primero
- No exponer una contraseña admin compartida como acceso a diferentes clientes.
- Seguir bloqueando producción WhatsApp hasta habilitación y consentimiento formal.
- Deducplicación con recuperación de failed y prevención de dobles envíos.
- Alta escala requiere colas persistentes, cuotas y controles de costo.
- No fingir conexiones a Meta, campañas, compras, reservas, envíos, grupos ni llamadas.
- No copiar propiedad intelectual de Wati ni usar sus estadísticas/testimonios como propios.
- No vender funciones pendientes como operativas.

## Secuencia recomendada
Fase 0 matriz detallada por página y tests; fase 1 auth + aislamiento + webhooks; fase 2 CRM/inbox/IA grounded; fase 3 flujos/campañas; fase 4 canales e integraciones; fase 5 web de marketing; fase 6 pilotos y validación externa.

El prompt completo de ejecución está en docs/METABOT_WORK_MASTER_PROMPT.md de esta misma rama.