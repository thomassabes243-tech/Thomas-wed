package com.parentaldual.app

import android.content.Context

object Prefs {
    private const val NAME = "parental_dual"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_TOKEN = "token"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_EMAIL = "email"
    private const val KEY_DEVICE_NAME = "device_name"
    private const val KEY_PAIRING_CODE = "pairing_code"

    private fun prefs(context: Context) = context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun saveRegistration(
        context: Context,
        baseUrl: String,
        token: String,
        deviceId: String,
        email: String,
        deviceName: String,
        pairingCode: String
    ) {
        prefs(context).edit()
            .putString(KEY_BASE_URL, baseUrl.trimEnd('/'))
            .putString(KEY_TOKEN, token)
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_EMAIL, email)
            .putString(KEY_DEVICE_NAME, deviceName)
            .putString(KEY_PAIRING_CODE, pairingCode)
            .apply()
    }

    fun baseUrl(context: Context) = prefs(context).getString(KEY_BASE_URL, "") ?: ""
    fun token(context: Context) = prefs(context).getString(KEY_TOKEN, "") ?: ""
    fun deviceId(context: Context) = prefs(context).getString(KEY_DEVICE_ID, "") ?: ""
    fun email(context: Context) = prefs(context).getString(KEY_EMAIL, "") ?: ""
    fun deviceName(context: Context) = prefs(context).getString(KEY_DEVICE_NAME, "") ?: ""
    fun pairingCode(context: Context) = prefs(context).getString(KEY_PAIRING_CODE, "") ?: ""
    fun registered(context: Context) = token(context).isNotBlank() && baseUrl(context).isNotBlank()
}
