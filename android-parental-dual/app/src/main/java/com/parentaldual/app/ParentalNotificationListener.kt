package com.parentaldual.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ParentalNotificationListener : NotificationListenerService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val item = sbn ?: return
        if (!Prefs.registered(this)) return
        if (item.packageName == packageName) return
        if (item.notification.visibility == Notification.VISIBILITY_SECRET) return

        val extras = item.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val body = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val appName = try {
            val appInfo = packageManager.getApplicationInfo(item.packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            item.packageName
        }

        scope.launch {
            try {
                Api.sendNotification(
                    this@ParentalNotificationListener,
                    appName,
                    sanitize(title),
                    sanitize(body)
                )
            } catch (_: Exception) {
            }
        }
    }

    private fun sanitize(value: String?): String? {
        if (value.isNullOrBlank()) return value
        val sensitive = Regex(
            "(otp|2fa|verification code|security code|código de verificación|código de seguridad|contraseña|password|pin bancario|tarjeta|banco)",
            RegexOption.IGNORE_CASE
        )
        val likelyCode = Regex("(^|\\D)\\d{4,8}(\\D|$)")
        return if (sensitive.containsMatchIn(value) || likelyCode.containsMatchIn(value)) {
            "[contenido sensible oculto]"
        } else {
            value.take(600)
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
