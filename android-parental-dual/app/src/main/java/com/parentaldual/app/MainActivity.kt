package com.parentaldual.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_REQUEST_KIND = "request_kind"
        const val EXTRA_SESSION_ID = "session_id"
    }

    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pendingAudioSession: String? = null
    private var pendingScreenSession: String? = null

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    private val audioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val sessionId = pendingAudioSession
        pendingAudioSession = null
        if (granted && sessionId != null) startAudio(sessionId)
        else if (sessionId != null) ioScope.launch {
            Api.setSessionStatus(this@MainActivity, sessionId, "denied")
        }
    }

    private val projectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val sessionId = pendingScreenSession
        pendingScreenSession = null
        if (sessionId == null) return@registerForActivityResult
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                action = ScreenCaptureService.ACTION_START
                putExtra(ScreenCaptureService.EXTRA_SESSION_ID, sessionId)
                putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.data)
            }
            ContextCompat.startForegroundService(this, serviceIntent)
        } else {
            ioScope.launch {
                Api.setSessionStatus(this@MainActivity, sessionId, "denied")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Notifications.createChannels(this)
        requestNotificationPermission()
        if (Prefs.registered(this)) startSync()
        handleRequestIntent(intent)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var registered by remember { mutableStateOf(Prefs.registered(this)) }
                    var baseUrl by remember {
                        mutableStateOf(Prefs.baseUrl(this).ifBlank { "https://TU-PROYECTO.vercel.app" })
                    }
                    var email by remember { mutableStateOf(Prefs.email(this)) }
                    var deviceName by remember {
                        mutableStateOf(Prefs.deviceName(this).ifBlank { Build.MODEL ?: "Android" })
                    }
                    var pairingCode by remember { mutableStateOf(Prefs.pairingCode(this)) }
                    var status by remember {
                        mutableStateOf(
                            if (registered) "Dispositivo registrado. Vinculalo desde el panel del tutor."
                            else "Registrá este teléfono para comenzar."
                        )
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text("Parental Dual", style = MaterialTheme.typography.headlineLarge)
                        Text(
                            "Control familiar transparente. Audio y pantalla requieren autorización visible en este teléfono.",
                            style = MaterialTheme.typography.bodyMedium
                        )

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                if (!registered) {
                                    OutlinedTextField(
                                        modifier = Modifier.fillMaxWidth(),
                                        value = baseUrl,
                                        onValueChange = { baseUrl = it },
                                        label = { Text("URL del panel Vercel") },
                                        singleLine = true
                                    )
                                    OutlinedTextField(
                                        modifier = Modifier.fillMaxWidth(),
                                        value = email,
                                        onValueChange = { email = it },
                                        label = { Text("Correo del dispositivo") },
                                        singleLine = true
                                    )
                                    OutlinedTextField(
                                        modifier = Modifier.fillMaxWidth(),
                                        value = deviceName,
                                        onValueChange = { deviceName = it },
                                        label = { Text("Nombre del dispositivo") },
                                        singleLine = true
                                    )
                                    Button(
                                        modifier = Modifier.fillMaxWidth(),
                                        onClick = {
                                            status = "Registrando..."
                                            ioScope.launch {
                                                try {
                                                    val result = Api.register(baseUrl, email, deviceName)
                                                    Prefs.saveRegistration(
                                                        this@MainActivity,
                                                        baseUrl,
                                                        result.token,
                                                        result.deviceId,
                                                        email,
                                                        deviceName,
                                                        result.pairingCode
                                                    )
                                                    pairingCode = result.pairingCode
                                                    registered = true
                                                    status = "Registrado. Usá el código en el panel del tutor."
                                                    startSync()
                                                } catch (e: Exception) {
                                                    status = e.message ?: "No se pudo registrar."
                                                }
                                            }
                                        }
                                    ) {
                                        Text("Registrar dispositivo")
                                    }
                                } else {
                                    Text("Código de vinculación", style = MaterialTheme.typography.labelLarge)
                                    Text(
                                        pairingCode.ifBlank { "Ya vinculado o código no disponible" },
                                        style = MaterialTheme.typography.displaySmall
                                    )
                                    Text("Correo: " + Prefs.email(this@MainActivity))
                                    Text("Dispositivo: " + Prefs.deviceName(this@MainActivity))
                                }
                            }
                        }

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text("Permisos y estado", style = MaterialTheme.typography.titleLarge)
                                Text(status)
                                OutlinedButton(
                                    modifier = Modifier.fillMaxWidth(),
                                    onClick = {
                                        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                                    }
                                ) {
                                    Text("Dar acceso a notificaciones")
                                }
                                if (registered) {
                                    Button(
                                        modifier = Modifier.fillMaxWidth(),
                                        onClick = {
                                            startSync()
                                            status = "Conexión activa."
                                        }
                                    ) {
                                        Text("Mantener conexión activa")
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            "Cuando el tutor solicite audio o pantalla, este teléfono mostrará una notificación. La persona que lo tenga debe tocarla y autorizar la función.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleRequestIntent(intent)
    }

    private fun handleRequestIntent(intent: Intent?) {
        val kind = intent?.getStringExtra(EXTRA_REQUEST_KIND) ?: return
        val sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: return
        when (kind) {
            "audio" -> authorizeAudio(sessionId)
            "screen" -> authorizeScreen(sessionId)
        }
    }

    private fun authorizeAudio(sessionId: String) {
        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            startAudio(sessionId)
        } else {
            pendingAudioSession = sessionId
            audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startAudio(sessionId: String) {
        val serviceIntent = Intent(this, AudioCaptureService::class.java).apply {
            action = AudioCaptureService.ACTION_START
            putExtra(AudioCaptureService.EXTRA_SESSION_ID, sessionId)
        }
        ContextCompat.startForegroundService(this, serviceIntent)
    }

    private fun authorizeScreen(sessionId: String) {
        pendingScreenSession = sessionId
        val manager = getSystemService(MediaProjectionManager::class.java)
        projectionLauncher.launch(manager.createScreenCaptureIntent())
    }

    private fun startSync() {
        if (!Prefs.registered(this)) return
        ContextCompat.startForegroundService(this, Intent(this, SyncService::class.java))
    }

    private fun requestNotificationPermission() {
        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
