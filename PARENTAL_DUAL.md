# Parental Dual — MVP

Parental Dual vive separado dentro de este repositorio:

- Panel web: `/parental-dual`
- API: `/api/parental/**`
- Android: `/android-parental-dual`
- Base de datos: proyecto Neon `green-river-94964280`, rama `production`

## Variables necesarias en Vercel

- `PARENTAL_DATABASE_URL`: cadena de conexión del proyecto Neon exclusivo de Parental Dual.
- `ADMIN_EMAIL`: correo que se muestra como administrador. Valor previsto: `tg321920@gmail.com`.
- `PARENTAL_ADMIN_KEY_HASH`: opcional. SHA-256 de una clave privada del tutor. Si no se configura, el código contiene un hash inicial generado para el MVP.

No cambies `DATABASE_URL` de MetaBot CR para este módulo; Parental Dual utiliza su propia variable para mantener las bases separadas.

## Flujo

1. El teléfono supervisado se registra y recibe un token de dispositivo y un código de 6 dígitos.
2. El tutor entra al panel con su clave privada y vincula el código.
3. Las notificaciones autorizadas se sincronizan al panel. Se redactan códigos de verificación y contenido marcado como sensible.
4. Al solicitar audio, el teléfono muestra una notificación. El usuario debe tocarla y autorizar el micrófono; mientras está activo se muestra una notificación permanente.
5. Al solicitar pantalla, Android muestra el diálogo oficial de MediaProjection. Mientras comparte pantalla se muestra una notificación permanente.
6. El panel puede detener cualquiera de las dos sesiones.

## Transporte del MVP

Para reducir complejidad y funcionar bien con Vercel serverless:

- Pantalla: una imagen JPEG actualizada aproximadamente cada 2 segundos.
- Audio: fragmentos AAC/MP4 de aproximadamente 4 segundos.
- Neon conserva solo el último fragmento de cada sesión, no un historial de audio o pantalla.

Esto evita almacenamiento innecesario y mantiene el MVP simple.

## Base de datos

Se utilizan tres tablas independientes:

- `parental_devices`
- `parental_notifications`
- `parental_sessions`

No se modifica el esquema funcional de MetaBot CR.

## Seguridad

- Tokens de dispositivos se guardan en la base únicamente como SHA-256.
- El panel exige una clave privada del administrador.
- La clave del administrador no se guarda en localStorage; el navegador usa sessionStorage durante la pestaña actual.
- El repositorio no contiene la cadena de conexión de Neon.
- Audio y pantalla no pueden iniciarse silenciosamente desde el panel: requieren autorización visible en Android.
