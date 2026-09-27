package com.parentaldual.app

import android.app.Service
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.WindowManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

class ScreenCaptureService : Service() {
    companion object {
        const val ACTION_START = "parental.screen.START"
        const val ACTION_STOP = "parental.screen.STOP"
        const val EXTRA_SESSION_ID = "session_id"
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var projection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var currentSessionId: String? = null
    private var lastFrameAt = 0L

    override fun onCreate() {
        super.onCreate()
        Notifications.createChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val sessionId = intent?.getStringExtra(EXTRA_SESSION_ID)
        when (intent?.action) {
            ACTION_START -> {
                if (sessionId != null) {
                    val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
                    val data = getProjectionData(intent)
                    if (data != null) startCapture(sessionId, resultCode, data)
                }
            }
            ACTION_STOP -> stopCapture(sessionId)
        }
        return START_NOT_STICKY
    }

    @Suppress("DEPRECATION")
    private fun getProjectionData(intent: Intent): Intent? {
        return if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            intent.getParcelableExtra(EXTRA_RESULT_DATA)
        }
    }

    private fun startCapture(sessionId: String, resultCode: Int, data: Intent) {
        if (projection != null) return
        currentSessionId = sessionId
        startForeground(
            202,
            Notifications.captureNotification(
                this,
                "Pantalla compartida",
                "La pantalla está siendo compartida con el tutor. Tocá para abrir Parental Dual."
            )
        )

        val manager = getSystemService(MediaProjectionManager::class.java)
        val mediaProjection = manager.getMediaProjection(resultCode, data)
        projection = mediaProjection
        mediaProjection.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                stopCapture(currentSessionId)
            }
        }, Handler(Looper.getMainLooper()))

        val metrics = DisplayMetrics()
        val windowManager = getSystemService(WindowManager::class.java)
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(metrics)
        val width = metrics.widthPixels.coerceAtLeast(360)
        val height = metrics.heightPixels.coerceAtLeast(640)
        val density = metrics.densityDpi

        val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        imageReader = reader
        reader.setOnImageAvailableListener({ imageReader ->
            val now = System.currentTimeMillis()
            if (now - lastFrameAt < 1800) {
                imageReader.acquireLatestImage()?.close()
                return@setOnImageAvailableListener
            }
            lastFrameAt = now
            val image = imageReader.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                val plane = image.planes[0]
                val buffer = plane.buffer
                val pixelStride = plane.pixelStride
                val rowStride = plane.rowStride
                val rowPadding = rowStride - pixelStride * width
                val bitmapWidth = width + rowPadding / pixelStride
                val bitmap = Bitmap.createBitmap(bitmapWidth, height, Bitmap.Config.ARGB_8888)
                bitmap.copyPixelsFromBuffer(buffer)
                val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
                val output = ByteArrayOutputStream()
                cropped.compress(Bitmap.CompressFormat.JPEG, 55, output)
                val bytes = output.toByteArray()
                bitmap.recycle()
                if (cropped !== bitmap) cropped.recycle()
                scope.launch {
                    try {
                        Api.uploadMedia(
                            this@ScreenCaptureService,
                            sessionId,
                            "image/jpeg",
                            bytes
                        )
                    } catch (_: Exception) {
                    }
                }
            } finally {
                image.close()
            }
        }, Handler(Looper.getMainLooper()))

        virtualDisplay = mediaProjection.createVirtualDisplay(
            "ParentalDualScreen",
            width,
            height,
            density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader.surface,
            null,
            null
        )

        scope.launch {
            try {
                Api.setSessionStatus(this@ScreenCaptureService, sessionId, "active")
            } catch (_: Exception) {
            }
        }
    }

    private fun stopCapture(requestedSessionId: String?) {
        val sessionId = currentSessionId ?: requestedSessionId
        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null
        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null
        val activeProjection = projection
        projection = null
        try { activeProjection?.stop() } catch (_: Exception) {}

        if (sessionId != null) {
            scope.launch {
                try {
                    Api.setSessionStatus(this@ScreenCaptureService, sessionId, "ended")
                } catch (_: Exception) {
                }
            }
        }
        currentSessionId = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        try { virtualDisplay?.release() } catch (_: Exception) {}
        try { imageReader?.close() } catch (_: Exception) {}
        try { projection?.stop() } catch (_: Exception) {}
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
