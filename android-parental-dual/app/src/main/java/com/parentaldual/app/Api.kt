package com.parentaldual.app

import android.content.Context
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class RegistrationResult(
    val deviceId: String,
    val token: String,
    val pairingCode: String
)

data class CommandResult(
    val id: String,
    val kind: String,
    val status: String
)

object Api {
    private suspend fun request(
        url: String,
        method: String,
        token: String? = null,
        body: String? = null
    ): Pair<Int, String> = withContext(Dispatchers.IO) {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 12000
            connection.readTimeout = 12000
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            status to text
        } finally {
            connection.disconnect()
        }
    }

    suspend fun register(baseUrl: String, email: String, deviceName: String): RegistrationResult {
        val body = JSONObject()
            .put("email", email)
            .put("name", deviceName)
            .toString()
        val (status, text) = request(
            baseUrl.trimEnd('/') + "/api/parental/device/register",
            "POST",
            body = body
        )
        if (status !in 200..299) error("No se pudo registrar el dispositivo")
        val json = JSONObject(text)
        return RegistrationResult(
            deviceId = json.getString("deviceId"),
            token = json.getString("token"),
            pairingCode = json.getString("pairingCode")
        )
    }

    suspend fun heartbeat(context: Context): Boolean {
        val (status, text) = request(
            Prefs.baseUrl(context) + "/api/parental/device/heartbeat",
            "POST",
            Prefs.token(context),
            "{}"
        )
        return status in 200..299 && JSONObject(text).optBoolean("paired", false)
    }

    suspend fun command(context: Context): CommandResult? {
        val (status, text) = request(
            Prefs.baseUrl(context) + "/api/parental/device/command",
            "GET",
            Prefs.token(context)
        )
        if (status !in 200..299) return null
        val root = JSONObject(text)
        if (root.isNull("command")) return null
        val command = root.getJSONObject("command")
        return CommandResult(
            id = command.getString("id"),
            kind = command.getString("kind"),
            status = command.getString("status")
        )
    }

    suspend fun sendNotification(context: Context, appName: String, title: String?, bodyText: String?) {
        val body = JSONObject()
            .put("appName", appName)
            .put("title", title)
            .put("body", bodyText)
            .toString()
        request(
            Prefs.baseUrl(context) + "/api/parental/device/notification",
            "POST",
            Prefs.token(context),
            body
        )
    }

    suspend fun setSessionStatus(context: Context, sessionId: String, statusValue: String) {
        val body = JSONObject()
            .put("sessionId", sessionId)
            .put("status", statusValue)
            .toString()
        request(
            Prefs.baseUrl(context) + "/api/parental/device/session",
            "POST",
            Prefs.token(context),
            body
        )
    }

    suspend fun uploadMedia(context: Context, sessionId: String, mime: String, bytes: ByteArray) {
        val body = JSONObject()
            .put("sessionId", sessionId)
            .put("mime", mime)
            .put("dataBase64", Base64.encodeToString(bytes, Base64.NO_WRAP))
            .toString()
        request(
            Prefs.baseUrl(context) + "/api/parental/device/media",
            "POST",
            Prefs.token(context),
            body
        )
    }
}
