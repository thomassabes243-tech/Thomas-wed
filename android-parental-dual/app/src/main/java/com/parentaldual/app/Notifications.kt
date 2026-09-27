package com.parentaldual.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object Notifications {
    const val CHANNEL_SYNC = "parental_sync"
    const val CHANNEL_REQUEST = "parental_requests"
    const val CHANNEL_CAPTURE = "parental_capture"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_SYNC, "Conexión Parental Dual", NotificationManager.IMPORTANCE_LOW)
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_REQUEST, "Solicitudes del tutor", NotificationManager.IMPORTANCE_HIGH)
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_CAPTURE, "Audio y pantalla activos", NotificationManager.IMPORTANCE_LOW)
        )
    }

    fun serviceNotification(context: Context, text: String): Notification {
        val openIntent = PendingIntent.getActivity(
            context, 10, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(context, CHANNEL_SYNC)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("Parental Dual conectado")
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .build()
    }

    fun captureNotification(context: Context, title: String, text: String): Notification {
        val openIntent = PendingIntent.getActivity(
            context, 11, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(context, CHANNEL_CAPTURE)
            .setSmallIcon(android.R.drawable.presence_online)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(openIntent)
            .build()
    }

    fun requestAuthorization(context: Context, command: CommandResult) {
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra(MainActivity.EXTRA_REQUEST_KIND, command.kind)
            putExtra(MainActivity.EXTRA_SESSION_ID, command.id)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, command.id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val title = if (command.kind == "audio") "Solicitud de audio" else "Solicitud para compartir pantalla"
        val text = if (command.kind == "audio") {
            "Tocá para autorizar el micrófono. Mientras esté activo verás un indicador."
        } else {
            "Tocá para autorizar compartir la pantalla. Android mostrará su confirmación."
        }
        val notification = NotificationCompat.Builder(context, CHANNEL_REQUEST)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()
        context.getSystemService(NotificationManager::class.java)
            .notify(command.id.hashCode(), notification)
    }
}
