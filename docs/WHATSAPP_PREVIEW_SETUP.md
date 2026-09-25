# MetaBot CR — WhatsApp Business (Preview / desarrollo)

Esta integración está diseñada para **Preview y desarrollo solamente**. El código devuelve 404 en Production.

## Flujo implementado

1. Seleccionar un negocio en `/catalog`.
2. Abrir **Conectar WhatsApp**.
3. Confirmar el número visible del negocio.
4. MetaBot muestra Callback URL y Verify Token.
5. Configurar la App de Meta y Embedded Signup.
6. Autorizar la cuenta mediante **Conectar con Meta**.
7. El servidor intercambia el código por el Access Token.
8. MetaBot verifica Phone Number ID y WABA ID contra Graph API.
9. El Access Token se cifra con AES-256-GCM antes de guardarse.
10. La app se suscribe al WABA.
11. Los mensajes entrantes llegan a `/api/webhooks/whatsapp`.
12. MetaBot guarda cliente, conversación y mensaje, consulta el catálogo y envía la respuesta por Cloud API.
13. Los mensajes reales aparecen en **Chats**.

## Variables requeridas — solamente Preview

- `DATABASE_URL` — base Neon `preview-catalog-test`.
- `META_APP_ID` — App ID de Meta.
- `META_APP_SECRET` — App Secret de Meta. No mostrar al cliente.
- `META_WHATSAPP_CONFIG_ID` — Configuration ID de Embedded Signup.
- `WHATSAPP_CREDENTIALS_KEY` — secreto aleatorio largo usado para cifrar tokens.
- `WHATSAPP_API_VERSION` — opcional; por defecto `v23.0`.
- `WHATSAPP_VERIFY_TOKEN` — opcional en Preview; si falta se deriva un token estable del entorno.
- `VERCEL_AUTOMATION_BYPASS_SECRET` — necesario si Deployment Protection impide que Meta alcance el webhook.
- `WHATSAPP_WEBHOOK_PUBLIC_URL` — opcional si se usa una URL pública dedicada para el webhook.

No guardar estas variables en Production durante las pruebas.

## Configuración en Meta Developer Dashboard

1. Crear o seleccionar una App de negocio.
2. Agregar el producto **WhatsApp**.
3. Crear una configuración de **Embedded Signup** y copiar su Configuration ID.
4. En Webhooks de WhatsApp:
   - Callback URL: copiarla desde la pestaña **Conectar WhatsApp**.
   - Verify Token: copiarlo desde la misma pantalla.
   - Suscribirse al campo **messages**.
5. El App Secret permanece únicamente en variables de servidor.
6. Autorizar la cuenta desde el botón **Conectar con Meta** del panel.

## Prueba real

1. El estado debe mostrar **Conectado**.
2. Phone Number ID y WABA ID deben aparecer.
3. Access Token debe mostrar **Guardado cifrado**.
4. Enviar un mensaje desde otro WhatsApp al número conectado.
5. El contador **Webhooks reales** debe aumentar.
6. El mensaje debe aparecer en **Chats**.
7. Si el bot está activo, la respuesta debe generarse con el catálogo y enviarse por Cloud API.
8. Una pregunta clínica de farmacia debe derivarse a una persona y no producir recomendaciones médicas.

## Diagnóstico

- **Token inválido**: el panel guarda el último error y el estado cambia a Error.
- **Webhook no verificado**: revisar Callback URL, Verify Token y Deployment Protection.
- **Número no asociado**: comprobar Phone Number ID obtenido por Embedded Signup.
- **0 webhooks**: Meta todavía no está entregando eventos a la URL configurada.
- **Mensaje entra pero no responde**: revisar token cifrado, estado del bot y logs de Preview.

## Seguridad

- Los tokens no se devuelven al navegador.
- Los tokens se almacenan cifrados.
- El webhook valida `X-Hub-Signature-256` con `META_APP_SECRET`.
- El procesamiento deduplica mensajes por ID de Meta.
- La integración de WhatsApp está bloqueada en Production.
