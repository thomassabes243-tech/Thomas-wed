package com.parentaldual.app

import android.app.Service
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File

class AudioCaptureService : Service() {
    companion object {
        const val ACTION_START = "parental.audio.START"
        const val ACTION_STOP = "parental.audio.STOP"
        const val EXTRA_SESSION_ID = "session_id"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var captureJob: Job? = null
    private var currentSessionId: String? = null

    override fun onCreate() {
        super.onCreate()
        Notifications.createChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val sessionId = intent?.getStringExtra(EXTRA_SESSION_ID)
        when (intent?.action) {
            ACTION_START -> if (sessionId != null) startCapture(sessionId)
            ACTION_STOP -> stopCapture(sessionId)
        }
        return START_NOT_STICKY
    }

    private fun startCapture(sessionId: String) {
        if (captureJob?.isActive == true) return
        currentSessionId = sessionId
        startForeground(
            201,
            Notifications.captureNotification(
                this,
                "Micrófono activo",
                "El audio está siendo compartido con el tutor. Tocá para abrir Parental Dual."
            )
        )
        captureJob = scope.launch {
            try {
                Api.setSessionStatus(this@AudioCaptureService, sessionId, "active")
                while (isActive) {
                    val file = File(cacheDir, "audio_" + System.currentTimeMillis() + ".m4a")
                    val recorder = createRecorder(file)
                    try {
                        recorder.prepare()
                        recorder.start()
                        delay(4000)
                        recorder.stop()
                    } catch (_: Exception) {
                    } finally {
                        try { recorder.reset() } catch (_: Exception) {}
                        try { recorder.release() } catch (_: Exception) {}
                    }
                    if (file.exists() && file.length() > 0) {
                        try {
                            Api.uploadMedia(
                                this@AudioCaptureService,
                                sessionId,
                                "audio/mp4",
                                file.readBytes()
                            )
                        } catch (_: Exception) {
                        }
                    }
                    file.delete()
                    delay(250)
                }
            } catch (_: Exception) {
                try {
                    Api.setSessionStatus(this@AudioCaptureService, sessionId, "error")
                } catch (_: Exception) {
                }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun createRecorder(file: File): MediaRecorder {
        val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            MediaRecorder()
        }
        recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        recorder.setAudioEncodingBitRate(32000)
        recorder.setAudioSamplingRate(16000)
        recorder.setOutputFile(file.absolutePath)
        return recorder
    }

    private fun stopCapture(requestedSessionId: String?) {
        val sessionId = currentSessionId ?: requestedSessionId
        captureJob?.cancel()
        captureJob = null
        if (sessionId != null) {
            scope.launch {
                try {
                    Api.setSessionStatus(this@AudioCaptureService, sessionId, "ended")
                } catch (_: Exception) {
                }
            }
        }
        currentSessionId = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        captureJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
