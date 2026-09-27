package com.parentaldual.app

import android.app.Service
import android.content.Intent
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class SyncService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var worker: Job? = null
    private var lastRequestedId: String? = null

    override fun onCreate() {
        super.onCreate()
        Notifications.createChannels(this)
        startForeground(
            100,
            Notifications.serviceNotification(
                this,
                "Conectado al panel. Audio y pantalla requieren autorización local."
            )
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (worker?.isActive != true) {
            worker = scope.launch {
                while (isActive) {
                    if (Prefs.registered(this@SyncService)) {
                        try {
                            Api.heartbeat(this@SyncService)
                            val command = Api.command(this@SyncService)
                            if (command != null) {
                                when (command.status) {
                                    "requested" -> {
                                        if (lastRequestedId != command.id) {
                                            lastRequestedId = command.id
                                            Notifications.requestAuthorization(this@SyncService, command)
                                        }
                                    }
                                    "stop_requested" -> {
                                        if (command.kind == "audio") {
                                            startService(Intent(this@SyncService, AudioCaptureService::class.java).apply {
                                                action = AudioCaptureService.ACTION_STOP
                                                putExtra(AudioCaptureService.EXTRA_SESSION_ID, command.id)
                                            })
                                        } else if (command.kind == "screen") {
                                            startService(Intent(this@SyncService, ScreenCaptureService::class.java).apply {
                                                action = ScreenCaptureService.ACTION_STOP
                                                putExtra(ScreenCaptureService.EXTRA_SESSION_ID, command.id)
                                            })
                                        }
                                    }
                                }
                            }
                        } catch (_: Exception) {
                        }
                    }
                    delay(5000)
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
