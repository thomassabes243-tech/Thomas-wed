# PROMPT MAESTRO — MetaBot CR, plataforma comercial con paridad funcional de referencia

Actuá como equipo senior integrado: arquitecto SaaS, ingeniero full-stack Next.js/TypeScript, especialista Meta WhatsApp Business Platform, diseñador UX/UI móvil, experto en ciberseguridad y privacidad, ingeniero de QA y director de marketing de SaaS B2B. Ejecutá trabajo real sobre el repositorio; no entregués solamente una propuesta ni una maqueta.

## REPOSITORIO Y PUNTO DE PARTIDA

- Repositorio: thomassabes243-tech/Thomas-wed
- Base verificada: rama feature/catalog-importer, commit baa2cda756a14405ef691a33873a65f610f0f4ef (2026-09-25 UTC).
- La rama feature/metabot-platform-parity-plan contiene este mandato y auditoría.
- Trabajá en una NUEVA rama de implementación derivada del último commit vigente de feature/catalog-importer; si el repositorio avanzó, inspeccioná diferencias antes de decidir base.
- La app existente se llama MetaBot CR, Next.js 15, React 19, TypeScript, Prisma/Neon; preservá sus rutas y funciones: sitio comercial, dashboard /catalog, importador CSV/XLSX, motor de catálogo, simulador, webhooks de WhatsApp, cifrado de credenciales y esquema multiempresa.
- No reconstruyas de cero, ni edites proyectos ajenos o ClipForge, ni modifiques main/producción sin aprobación expresa.
- No publiques, no envíes mensajes reales, no inicies campañas, no generes cargos, no habilites cobros ni migres DB productivas sin aprobación expresa. Usá sandbox/datos sintéticos, vistas previas y flags seguros.

## MISIÓN

Construir MetaBot CR como SaaS B2B para Costa Rica y posterior expansión regional, con una cobertura funcional comparable a las categorías actuales que exhiben Wati y Respond.io: marketing, captación, ventas, CRM, omnicanal, soporte, chatbots visuales, agentes de IA, catálogo, pedidos, reservas, pagos integrables, campañas, mensajes transaccionales, equipos, analíticas e integraciones. La intención es IGUALAR CAPACIDADES COMERCIALES, no copiar su código, marca, textos, capturas, logos, imágenes, testimonios, precio, promesas, tipografía propietaria ni un pixel-perfect de su interfaz. Diseño original, mejor móvil y enfoque PyME.

Fuentes públicas a investigar y actualizar durante la ejecución:
- https://www.wati.io/es/
- https://www.wati.io/es/product-overview/
- https://www.wati.io/es/pricing/
- https://www.wati.io/es/pricing-comparison/
- https://support.wati.io/es/articles/11375155-descripcion-general-de-wati-funciones-canales-e-integraciones
- https://support.wati.io/es/
- https://respond.io/es/ai-agents
- https://www.postman.com/meta/whatsapp-business-platform/overview
- Documentación oficial y política de cada API por canal y país.

Creá docs/REFERENCE_FEATURE_MATRIX.md con una fila por CADA función, punto de navegación, botón, beneficio, sección, subfunción y flujo documentado en las páginas de referencia; columnas: fuente y URL, categoría, capacidad (en palabras propias), implementación en MetaBot, archivo/ruta, estado REAL (completo/parcial/no implementado/bloqueado por permisos), prueba verificable, requisito externo y prioridad. No dar por completa una capacidad por existir solo una pantalla. Si la función del proveedor no puede conocerse desde su sitio público, señalá la incertidumbre. Nunca infieras su arquitectura interna.

## INVENTARIO FUNCIONAL EXIGIDO

A. COMERCIAL / PÁGINA PÚBLICA
- Página original de aspecto profesional, responsiva y rápida, navegación móvil, menú por Soluciones/Marketing/Ventas/Soporte/Producto/Industrias/Precios/Recursos.
- Hero con propuesta concreta, CTAs operativos de demo y contacto; ejemplos reales etiquetados como demostración, interacción Marketing/Ventas/Soporte; beneficios y limitaciones transparentes.
- Secciones originales: omnicanal; IA; captación/marketing; ventas y calificación de clientes; soporte; integraciones; industrias; cómo funciona; precios; preguntas frecuentes; seguridad; documentación; contacto; pie de página.
- Demostración por sector (restaurantes, tiendas, clínicas con escalamiento, barberías/salones, turismo/hoteles). Simulador interactivo verdadero sin WhatsApp ni facturación; no fingir ventas/estadísticas.
- Inicio de sesión/registro, acceso a prueba, formulario de venta conectado a almacenamiento/CRM, anti-spam, consentimiento, correos transaccionales si hay proveedor, confirmación de recepción y trazabilidad.
- SEO real: metadatos, OpenGraph, schema.org apropiado, sitemap, robots, páginas legales, accesibilidad, Core Web Vitals.
- Planes originales en CRC (Inicio/Negocios/Avanzado), cotización de instalación, cupos, límites, consumos aparte, demo gratuita; tarifas configurables desde admin. No mostrar botón de compra que falle.

B. ONBOARDING MULTIEMPRESA Y SEGURIDAD
- Autenticación real por usuario, sesiones seguras, recuperación, invitaciones, propietarios, administradores, agentes, supervisores; MFA si proveedor disponible.
- Tenant isolation en TODAS las lecturas/escrituras, backend auth obligatoria y políticas de acceso por empresa; separar admin de plataforma y dueño de negocio. Remover credenciales demo/predeterminadas compartidas y dependencias inseguras de URL de DB como secreto de sesión.
- Alta de empresa, industria, país, zona horaria, moneda, branding, usuarios, horarios, idioma, números y canales; wizard guiado y checklist de preparación.
- Suscripciones y medición de consumo con límites y facturación transparente; pagos solo cuando haya proveedor acreditado y autorización. Registro de eventos, auditoría, exportación/borrado con permisos y políticas de retención.
- Tablero de plataforma para operador MetaBot y tablero separado para el cliente. Pruebas anti-IDOR y entre tenants.

C. MENSAJERÍA MULTICANAL
- Adaptadores aislados por canal: WhatsApp Cloud API oficial como prioridad; luego Instagram DM/comentarios/stories, Facebook Messenger y chat web; diseñar adaptadores opcionales para SMS, RCS, TikTok, llamadas de WhatsApp si realmente se aprueban API, región y permisos.
- Multi-número por negocio, estado de conexión, Embedded Signup, cifrado de tokens, refresh/rotación, webhooks con firmas verificadas, eventos duplicados y fuera de orden, colas persistentes, reintentos con backoff, límites de tasa, estados de envío/entregado/leído/fallido, descargas autorizadas de media, auditoría y monitorización.
- No usar WhatsApp Web scraping, automatización no oficial, tokens en navegador ni simular soporte de un canal sin API verificable. Funciones de grupos o pagos nativos de WhatsApp SOLO si la API aprobada admite el caso específico; de lo contrario, marcar bloqueado por proveedor y ofrecer flujo alternativo explícito.
- Mensajes texto, imágenes, documentos, audio cuando la API lo admita; no afirmar soporte hasta probar mensajes reales en sandbox/entorno autorizado.

D. BANDEJA COMPARTIDA DE EQUIPO
- Lista de conversaciones omnicanal, búsquedas, filtros, etiquetas, prioridad, historial, datos de contacto y adjuntos; respuestas, respuestas guardadas, notas internas, menciones, asignación manual y automática por carga/horario/equipo, estados abierto/en espera/atención humana/cerrado.
- Colisión entre agentes, pausa/reanudación de bot, SLA, avisos de chats pendientes y escalamiento humano correcto; auditoría de cada intervención.
- Editor asistido con IA opcional: borradores, resúmenes, traducción, clasificación, sugerencias y puntuación de calidad, sin enviar nada hasta revisión humana si se configura.
- Métricas de primera respuesta, resolución, reabiertos, derivaciones, desempeño individual y satisfacción a partir de respuestas reales.

E. CONSTRUCTOR VISUAL DE CHATBOTS / AUTOMATIZACIONES
- Editor usable en móvil con alternativa accesible de lista/pasos, además de conexiones visuales en escritorio.
- Nodos: disparador, mensaje, pregunta, guardar campo, condición, ramificación, etiquetas, esperar, horario, asignar equipo/agente, enviar plantilla aprobada, consultar catálogo, consultar disponibilidad real conectada, crear lead/pedido/cita provisional, webhook HTTP seguro, integración, IA, escalamiento, terminar flujo.
- Borradores, versiones, validación de ciclos, historial de cambios, simulación, preview, publicación controlada, rollback, logs por ejecución y fallbacks ante errores. Nada de flujos decorativos sin motor ejecutor.

F. AGENTES DE IA
- Agente para recepción y soporte, agente para prospectos/ventas y asistente interno de equipo; perfiles por industria.
- Base de conocimiento autorizada (FAQs, documentos cargados, textos, catálogos y fuentes configuradas), búsqueda grounded con referencias internas, límites de herramienta, instrucciones por negocio, memoria limitada y consentida.
- Calificación de leads, extracción de intención y campos, preguntas de seguimiento, recomendaciones de catálogo solo sobre datos reales, resumen, traducción, borradores y transferencias correctas a humanos.
- Proveedores de modelos intercambiables y económicos (provider adapter), configuración por tenant, presupuestos/token usage, circuit breakers, timeouts, evals, detección de inyección en contenido recuperado, no inventar precios/stock/cupos/confirmaciones ni diagnósticos clínicos.

G. CONTACTOS Y CRM
- Perfil unificado con datos autorizados y procedencia por canal, tags, atributos personalizados, fuente/UTM, consentimientos y bajas, deduplicación prudente.
- Pipeline Kanban, etapas, responsables, lead scoring explicable, oportunidades, tareas, recordatorios, seguimiento y actividades.
- Import/export CSV con validación; sincronizaciones CRM opt-in con proveedor autorizado; no fusionar identidades sin base legítima.

H. MARKETING, ANUNCIOS Y CAMPAÑAS
- Enlaces click-to-chat y QR, widget de WhatsApp/chat web, attribution de UTMs/referrals, leads provenientes de Ads y redes si API lo permite.
- Segmentación por consentimiento, canal, etapa, tags, última interacción; plantillas sometidas a revisión de Meta, personalización y traducción revisada.
- Campañas draft->approve->schedule->send con aprobación humana, límites por empresa y presupuesto, supresión, opt-out/STOP, frecuencia máxima, reglas de ventanas de mensajería y plantillas.
- Campañas de recuperación de carrito / reenganche solo con autorización legal/política; seguimiento post-conversión, lectura, respuesta, resultados y costos. Prohibido spam y contactos sin opt-in.
- Integrar anuncios Meta click-to-WhatsApp, comentarios a DM y seguimiento de conversiones ÚNICAMENTE tras confirmar permisos oficiales y consentimiento.

I. COMERCIO, CATÁLOGO, RESERVAS Y PAGOS
- Conservar importador CSV/XLSX, previsualización/mapeo, deduplicación SKU, precios en CRC/USD por negocio, stock, categorías, historial, edición, permisos, filtros.
- Catalogo digital y, si está autorizado, sincronización al Meta Catalog real; pedidos con estados (nuevo/pendiente/confirmado/preparación/entregado/cancelado) y pedido no confirmado sin intervención o sistema fuente verificable.
- Reservas para salones, tours, hoteles y servicios con calendarización/inventario real conectado; doble reserva prevenible, zonas horarias y confirmación explícita. No afirmar disponibilidad sin consultar fuente actual.
- Enlaces de pago de proveedor local habilitado y pago manual SINPE con validación por un humano; nunca almacenar tarjetas ni fingir pagos completados. Checkout avanzado solo con integraciones válidas.
- Notificaciones de pedido, citas, vencimientos y seguimiento mediante plantillas habilitadas y consentimiento.

J. ANÁLISIS Y OPERACIÓN
- Dashboards por empresa y plataforma: volumen, tiempos de respuesta, SLA, derivación, embudo, conversiones registradas, fuentes de leads, campañas, calidad del bot, fallbacks, costo de Meta y costo IA.
- Rangos, filtros, exportación CSV, gráficas con datos reales, informes periódicos opcionales. Distinguir estimaciones de datos observados y evitar cifras engañosas.
- Observabilidad: logs sin datos sensibles, errores, trazas con redacción de PII, alertas y estado de conectores, reintentos/reprocesado controlado, copias de seguridad/restauración probadas.

K. INTEGRACIONES Y PLATAFORMA
- Webhooks salientes firmados, API pública con tokens por negocio y scopes/rate limits, integraciones modulares para Google Sheets, HubSpot, Salesforce, Zoho, Shopify, WooCommerce, Zapier, Make, n8n y herramientas locales cuando exista acceso.
- No declarar una integración como funcional sin autenticarla y demostrar al menos una operación real en sandbox; si falta credencial, entregar adaptador, mocks, contrato y checklist external_action_required.
- Facturación del SaaS, planes, límites y metering por negocio con controles contra cobros inesperados; panel de administración de soporte y auditoría.

## INGENIERÍA: DEFECTOS CONCRETOS YA IDENTIFICADOS

1. El módulo lib/catalog/admin-session.ts usa acceso administrativo provisional y no autenticación por empresa. Migrar a seguridad real con roles y tests, manteniendo demo segura.
2. lib/meta/config.ts limita WhatsApp a Preview/desarrollo. Mantener esa protección hasta pruebas oficiales completas; no desbloquear producción por una bandera sin controles.
3. app/api/webhooks/whatsapp/route.ts necesita reintentos seguros: un WebhookEvent previo failed no debe descartarse permanentemente como duplicate, pero tampoco enviar dos respuestas al reprocesar. Diseñar idempotencia por etapa y procesamiento durable.
4. lib/catalog/answer.ts es un motor de reglas/búsqueda, no un agente LLM; no anunciar IA generativa como completada.
5. lib/ai/rules.ts sirve la demo con datos ilustrativos; no utilizar precios ficticios para confirmar pedidos reales.
6. Preservar migraciones Prisma anteriores; cambios aditivos, auditados y con rollback; no ejecutar cambios productivos sin aprobación.
7. Verificar dependencias de seguridad, configuración del framework y costos recurrentes; evitar servicios caros por defecto.

## PLAN DE TRABAJO Y CRITERIOS DE ACEPTACIÓN

Fase 0 Auditoría reproducible: git status, diff/branches, árbol, dependencias, tests, documentación, páginas públicas, mapa de endpoints y datos, seguridad, estado CI/Deploy, capacidades API por país. Crear matriz exhaustiva, lista de tareas priorizada y archivo docs/EXTERNAL_ACTIONS_REQUIRED.md. Continuar a implementación, no detenerse en un informe.

Fase 1 Núcleo vendible y seguro: aislamiento multiempresa, login por dueño/agente, webhook e idempotencia durables, inbox realmente operativa, importación real, bot grounded, take-over humano, monitor de errores. Tests E2E de dos empresas que demuestren aislamiento.

Fase 2 Flujo comercial funcional: alta guiada, demo móvil, formularios persistentes, lead CRM, pedidos/reservas provisionales y embudo, IA configurable con fallback, links/QR, métricas de verdad.

Fase 3 Constructor visual, campañas y WhatsApp interactivo: motor ejecutor, validación, versionado, consentimientos, plantillas, scheduler seguro, reportes. Cero envíos sin autorización.

Fase 4 Nuevos canales e integraciones: conectores oficiales bajo flags, cada uno con estado no configurado/pendiente/activo/error, pruebas en sandbox, API y webhooks firmados.

Fase 5 Sitio comercial original inspirándose en arquitectura informativa de Wati: excelentes demos por sector, navegación completa, CTA funcional, tarifas configurables, SEO, contacto y legales; nunca inventar logos, casos reales, cifras de conversión ni testimonios.

Fase 6 Calidad y lanzamiento controlado: suites unitarias, integración, E2E móvil, accesibilidad, seguridad, migraciones, costes, backups, smoke real con cuentas autorizadas, revisión humana y rollout gradual.

Cada función declarada lista debe tener ruta visible, comportamiento de servidor, persistencia apropiada, estado de carga/error y prueba. Si depende de un permiso o sistema externo ausente, mostrar claramente Bloqueado por configuración externa; NO crear falsos simuladores que parezcan producción. Usar pruebas de contrato sin secretos y feature flags deshabilitadas por defecto. Registrar riesgos y decisiones técnicas.

ENTREGABLES: commits pequeños en rama nueva, PR a revisión (sin merge automático), documentos docs/REFERENCE_FEATURE_MATRIX.md, docs/ARCHITECTURE.md, docs/EXTERNAL_ACTIONS_REQUIRED.md, docs/SECURITY_TESTS.md, docs/METABOT_ROADMAP.md; esquema DB y migraciones cuando correspondan; tests y resultado de build, captura de demo móvil si el entorno soporta navegador; comparativa verificable de antes/después. Señalar estado por característica: DONE / PARTIAL / BLOCKED / NOT_STARTED y evidencias. Dar porcentajes solo si están calculados por pruebas/criterios, no estimados subjetivamente.

INSTRUCCIÓN FINAL: Trabajá hasta donde el acceso y las pruebas lo permitan EN ESTA EJECUCIÓN, priorizando funcionalidad auténtica y seguridad. No esperes permiso por cambios de código normales dentro de la rama de trabajo; sí detenete antes de acciones externas sensibles, publicación, envíos, campañas, consumo de dinero, conexión de credenciales o producción. No declares MetaBot equivalente a Wati ni listo para cobrar mientras haya bloqueos. Entregá URLs exactas del código, PR, preview si existe y resultados verificables.