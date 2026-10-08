# MetaBot CR: recuperación de webhooks de WhatsApp (Preview)

## Por qué fue necesario
El código anterior creaba WebhookEvent(processing) y bloqueaba para siempre cualquier ID
existente, incluso cuando el envío fallaba; además podía persistir el inbound antes de
fallar y registrar una respuesta local incompleta.

## Flujo nuevo
1. Verificar la firma Meta sobre el cuerpo original y permitir únicamente Preview/desarrollo.
2. Crear un registro durable de cada evento textual válido (ID Meta, empresa, remitente,
   texto, fecha). No mezclar identidades por businessId.
3. Reservar atómicamente la preparación de respuesta. Si falla antes de tocar Meta,
   responder HTTP 503 para que Meta pueda reintentar. La información entrante queda guardada.
4. Guardar el inbound y la respuesta preparada con una transacción en PostgreSQL, antes
   de cualquier llamada a Meta.
5. Comprobar teléfono, credenciales cifradas y negocio activo. Si no hay configuración,
   el evento sigue listo y NO se envía nada ni se inventa confirmación.
6. Marcar el evento como sending atómicamente ANTES de ejecutar la llamada remota.
7. Solo cuando Meta devuelve un identificador de mensaje se guarda el outbound y
   el evento sent/procesado en una transacción.
8. Si el estado de entrega es incierto (timeout, caída después de enviar, error DB
   posterior a la aceptación), se marca needs_review + uncertain. No hay reenvío
   automático desde ese estado.
9. Monitorear excepciones desde /catalog/whatsapp-events (operator Preview).
   La revisión debe consultar el identificador del proveedor cuando exista y
   verificar la conversación real antes de realizar cualquier acción manual.

## Garantías y límites importantes
- No se declara "exactly-once" sobre la API de Meta: sin una clave de
  idempotencia aceptada por el proveedor es imposible garantizarlo.
- La política prioriza prevenir duplicados. En situaciones inciertas puede
  requerirse una respuesta manual: esto NO garantiza que todo mensaje se responda.
- Eventos con error antes del intento remoto pueden reintentarse; si se agotan
  los reintentos de preparación requieren intervención humana.
- El POST procesará en línea una pequeña cantidad de mensajes. Para escala real
  requiere cola persistente, workers y observabilidad con presupuesto; no marcar
  listo para producción todavía.
- Los datos de texto recibidos son personales. Deben definirse retención,
  borrado, cifrado en reposo y permisos internos antes de lanzamiento.
- No se cambió la bandera de Preview. No hay envío real en tests.
- La migración se debe ensayar en una base aislada; no ejecutar en producción.

## Pruebas
scripts/whatsapp-delivery-db-smoke.ts usa PostgreSQL temporal y un sender falso,
verificando un solo envío por ID, rechazo de cambio de empresa, recuperación previa
al envío, fallo ambiguo sin repetición y reserva vencida.

## Prohibido activar
No habilitar WhatsApp productivo sin cuenta oficial aprobada, número conectado,
tokens protegidos, plantilla apropiada, consentimiento, pruebas reales y
aprobación explícita del propietario.
