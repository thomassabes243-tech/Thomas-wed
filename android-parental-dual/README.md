# Parental Dual Android

Aplicación supervisada del MVP Parental Dual.

## Funciones

- Registro del dispositivo por correo.
- Código temporal de 6 dígitos para vincularlo con el panel.
- Lectura de notificaciones mediante NotificationListenerService, después de que el usuario activa el permiso del sistema.
- Solicitudes de audio con autorización visible y servicio en primer plano.
- Solicitudes de compartir pantalla mediante MediaProjection, con el diálogo oficial de Android y servicio en primer plano.
- Indicador permanente mientras la conexión, el micrófono o la pantalla están activos.

No incluye vigilancia oculta, keylogger, bypass de permisos ni grabación secreta.

## Compilación

El workflow de GitHub Actions `.github/workflows/parental-dual-android.yml` genera un APK de depuración como artifact.

También puede compilarse con:

    gradle -p android-parental-dual :app:assembleDebug

## Primer uso

1. Abrir la app.
2. Escribir la URL HTTPS del despliegue de Vercel.
3. Registrar un correo y nombre de dispositivo.
4. Copiar el código de 6 dígitos.
5. Abrir `/parental-dual` en el panel y vincular el código.
6. Activar el acceso a notificaciones desde Android.
7. Las solicitudes de audio o pantalla llegan como una notificación y requieren tocar y autorizar en el teléfono.
