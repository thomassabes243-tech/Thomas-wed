# MetaBot CR — matriz inicial de capacidades de referencia

Referencias públicas: https://www.wati.io/es/ ; https://www.wati.io/es/product-overview/ ; https://www.wati.io/es/pricing-comparison/ ; https://support.wati.io/es/articles/11375155-descripcion-general-de-wati-funciones-canales-e-integraciones ; https://respond.io/es/ai-agents

Capacidades reescritas, no copias de textos, activos o diseño de terceros. Debe ampliarse más allá de esta primera tabla al revisar cada página y control de referencia.

| Categoría | Capacidad comparable | Estado MetaBot | Evidencia actual / validación pendiente |
| --- | --- | --- | --- |
| Comercial | Landing, beneficios y CTA | PARTIAL | app/page.tsx; verificar captación real |
| Demo | Conversación interactiva | PARTIAL | app/api/demo/chat; datos sintéticos |
| Operadores | Login técnico | PARTIAL | lib/catalog/auth-core.ts; Preview solamente |
| Usuarios | Login por cliente/empresa | NOT_STARTED | User y BusinessUser en Prisma, sin auth individual |
| WhatsApp | Embedded Signup y webhooks | PARTIAL | lib/meta y api/webhooks; permisos externos |
| Bandeja | Historial y agente humano | PARTIAL | app/api/catalog/conversations; falta envío humano real |
| Catálogo | Importar y consultar CSV/XLSX | PARTIAL | lib/catalog, pruebas y DB real |
| Agente IA | Soporte y ventas grounding | NOT_STARTED | catálogo/reglas, no agente LLM |
| Flujos | Nodos, versionado y ejecución | NOT_STARTED | requiere editor + motor |
| Marketing | Campañas y plantillas | NOT_STARTED | opt-in, Meta approval y sender |
| CRM | Pipeline y tareas | NOT_STARTED | solo Customer/Conversation básicos |
| Comercio | Pedidos/citas/pagos | NOT_STARTED | fuente real y provider de pagos |
| Omnicanal | Instagram/Messenger/chat | NOT_STARTED | autorizaciones API |
| Análisis | Métricas y costos | PARTIAL | dashboard básico y calculadora ilustrativa |
| Integraciones | Webhooks/CRM/Shopify/Sheets | NOT_STARTED | OAuth, contrato y E2E |
| SaaS | Planes, cuotas y facturación | NOT_STARTED | verificación de pagos y consumo |

No llamar DONE a una función sin prueba, autorización e integración real.
