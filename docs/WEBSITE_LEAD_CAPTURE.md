# MetaBot CR — captación comercial: estado y controles

## Implementado en código
- Página pública ahora conduce al formulario real o a la demo identificada como ilustración, sin gráficas ficticias en portada.
- Formulario: components/lead-form.tsx.
- Endpoint: POST /api/leads. Validación Zod, consentimiento explícito, control Origin, tamaño máximo de petición, honeypot y deduplicación diaria por correo.
- Almacenamiento PostgreSQL: modelo SalesLead, migración 20261008223000_website_sales_leads.
- Panel de revisión para el operador (Preview): /catalog/leads. Permite cambiar estado pendiente, contactado o cerrado.
- Página de privacidad informativa preliminar: /privacidad.
- Pruebas integradas contra un PostgreSQL temporal en GitHub Actions.

## Activación segura
METABOT_LEAD_CAPTURE_ENABLED=false por defecto. Si permanece desactivado, la página NO simula un envío: informa que el servicio de solicitudes está en preparación.

Antes de habilitar:
1. Identificar la cuenta de Vercel y la base de MetaBot, y verificar backups.
2. Revisar y aplicar la migración en una instancia de pruebas, no sobre producción por iniciativa del agente.
3. Preparar una forma segura de consultar leads en el entorno de recepción. Hoy el panel de operador es Preview/local, no de producción.
4. Completar mitigación anti-spam en el borde, limitación por IP, protección contra abuso y alertas. Los controles actuales son básicos.
5. Revisar los textos de privacidad por país, retención, supresión, contacto del responsable y permisos de la plataforma.
6. Realizar pruebas E2E reales desde navegador móvil.
7. Con aprobación expresa y pruebas completas, activar la bandera en el entorno autorizado.

## Limitaciones
El formulario no envía email automático, no contacta WhatsApp, no dispara campañas, no procesa cobros y no activa una cuenta de negocio. Una solicitud guardada no es una venta.
El sistema SaaS general sigue incompleto y no debe promocionarse como equivalente funcional a Wati.

## Evidencia
Consultar el último run del workflow .github/workflows/metabot-security-validation.yml sobre el commit actual. Un workflow creado pero todavía en curso no constituye resultado PASS.
