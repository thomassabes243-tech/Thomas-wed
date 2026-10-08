# MetaBot CR — bloqueos y acciones externas (fase de seguridad)

## Estado
La rama de implementación únicamente contiene cambios de código. **No se ha cambiado ninguna variable de producción, no hay despliegues nuevos, no se han enviado mensajes y no se han aplicado migraciones.**

## Autenticación Preview (operador temporal)
La antigua contraseña fija de Preview y el secreto de sesión derivado de DATABASE_URL fueron retirados del código de esta rama. Para usar el panel temporalmente en Preview, el propietario debe configurar en ese entorno, y nunca publicarlos en GitHub:
- CATALOG_SESSION_SECRET: secreto aleatorio independiente de al menos 32 caracteres.
- CATALOG_ADMIN_PASSWORD_SCRYPT: hash scrypt del password del operador, obtenido localmente con scripts/generate-catalog-admin-hash.mjs.
- DATABASE_URL: conexión de pruebas dedicada, no producción.

Para generar hash de forma interactiva en una shell que oculte la clave:

    read -rsp 'Contraseña operador: ' PASS; echo
    printf %s "$PASS" | node scripts/generate-catalog-admin-hash.mjs
    unset PASS

Guardar **solo el hash** como secreto de Preview; la contraseña original no debe enviarse en chats, pull requests ni registros. No habilitar este acceso compartido para clientes de producción. La ruta de login se deshabilita en Production hasta que exista autenticación independiente por usuario y empresa.

## Autorizaciones futuras necesarias
1. Habilitar acceso a instancia de desarrollo de Neon con datos sintéticos para pruebas E2E. No usar la DB productiva.
2. Aprobar un proveedor de autenticación o proceso de invitación, reseteo de contraseña, roles y segundo factor según necesidades comerciales.
3. Revisar cuentas y permisos de Meta Developers, número de WhatsApp de pruebas, política de mensajes y consentimiento. Los webhooks reales siguen bloqueados en producción.
4. Solicitar explícitamente aprobación antes de credenciales, cambios productivos, migraciones, mensajes reales, campañas o pagos.
5. Verificar si hay proyecto Vercel MetaBot en otra cuenta; esta conexión no mostró thomas-web.

## Pendientes técnicos importantes
- Implementar login por usuario/empresa usando User + BusinessUser y comprobar aislamiento en DB.
- Revisar todos los POST/PUT/PATCH/DELETE de negocio, con protección CSRF y autenticación granular. Se añadió una primera barrera Origin para /api/catalog.
- Implementar límites de intentos de inicio de sesión con almacenamiento compartido y protección de borde/WAF antes de exponer Preview públicamente.
- Revisar el estado failed del webhook: los mensajes deben poder reintentarse sin doble envío.
- Hacer pruebas E2E en base sintética y conexiones de WhatsApp de prueba antes de prometer servicio real.
