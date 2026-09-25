"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/catalog/catalog.module.css";

type SetupPayload = {
  previewOnly: true;
  business: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
  connection: {
    status: string;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    tokenStored: boolean;
    connectedAt: string | null;
    lastError: string | null;
    webhookEvents: number;
    lastWebhookAt: string | null;
    lastWebhookStatus: string | null;
  };
  meta: {
    appId: string | null;
    configId: string | null;
    appSecretReady: boolean;
    encryptionReady: boolean;
    embeddedSignupReady: boolean;
  };
  webhook: {
    callbackUrl: string;
    verifyToken: string | null;
    verifyTokenReady: boolean;
    protectionBypassConfigured: boolean;
  };
};

type FacebookSdk = {
  init(options: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }): void;
  login(
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: Record<string, unknown>,
  ): void;
};

type EmbeddedAssets = {
  phoneNumberId: string;
  businessAccountId: string;
};

export default function WhatsAppConnectionPanel({
  businessId,
}: {
  businessId: string;
}) {
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const codeRef = useRef("");
  const assetsRef = useRef<EmbeddedAssets | null>(null);

  const loadSetup = useCallback(async () => {
    const response = await fetch(
      `/api/catalog/whatsapp-setup?businessId=${encodeURIComponent(businessId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar WhatsApp.");
    setSetup(data);
    setPhoneNumber(data.business?.phoneNumber ?? "");
    return data as SetupPayload;
  }, [businessId]);

  useEffect(() => {
    setMessage("");
    void loadSetup().catch((error) =>
      setMessage(error instanceof Error ? error.message : "No se pudo cargar WhatsApp."),
    );
  }, [loadSetup]);

  useEffect(() => {
    if (!setup?.meta.appId) return;

    const existing = document.getElementById("facebook-jssdk");
    const initSdk = () => {
      const fb = (window as unknown as { FB?: FacebookSdk }).FB;
      if (!fb || !setup.meta.appId) return;
      fb.init({
        appId: setup.meta.appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: "v23.0",
      });
      setSdkReady(true);
    };

    if (existing) {
      initSdk();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = initSdk;
    script.onerror = () => setMessage("No se pudo cargar el SDK de Meta.");
    document.body.appendChild(script);
  }, [setup?.meta.appId]);

  const finishConnection = useCallback(async () => {
    const code = codeRef.current;
    const assets = assetsRef.current;
    if (!code || !assets) return;

    setBusy(true);
    setMessage("Validando la cuenta con Meta…");
    try {
      const response = await fetch("/api/catalog/whatsapp-setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete-signup",
          businessId,
          phoneNumber,
          code,
          phoneNumberId: assets.phoneNumberId,
          businessAccountId: assets.businessAccountId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la conexión.");
      setSetup(data);
      setPhoneNumber(data.business?.phoneNumber ?? phoneNumber);
      setMessage("WhatsApp quedó conectado. Falta confirmar que Meta pueda entregar el primer webhook real.");
      codeRef.current = "";
      assetsRef.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo conectar WhatsApp.");
      await loadSetup().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [businessId, phoneNumber, loadSetup]);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      let payload = event.data as unknown;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload || typeof payload !== "object") return;
      const data = payload as {
        type?: string;
        event?: string;
        data?: { phone_number_id?: string; waba_id?: string };
      };

      if (data.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && data.data?.phone_number_id && data.data?.waba_id) {
        assetsRef.current = {
          phoneNumberId: data.data.phone_number_id,
          businessAccountId: data.data.waba_id,
        };
        void finishConnection();
      } else if (data.event === "CANCEL") {
        setMessage("La conexión con Meta fue cancelada.");
      } else if (data.event === "ERROR") {
        setMessage("Meta reportó un error durante la conexión.");
      }
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [finishConnection]);

  async function postAction(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/catalog/whatsapp-setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, businessId, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la acción.");
      setSetup(data);
      setPhoneNumber(data.business?.phoneNumber ?? phoneNumber);
      return data as SetupPayload;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function savePhone() {
    const data = await postAction("save-phone", { phoneNumber });
    if (data) setMessage("Número guardado para este negocio.");
  }

  async function validateConnection() {
    const data = await postAction("validate");
    if (data) setMessage("Meta confirmó el Phone Number ID, WABA ID y el acceso de la app.");
  }

  async function disconnect() {
    const data = await postAction("disconnect");
    if (data) setMessage("Conexión de WhatsApp eliminada de este negocio.");
  }

  function startEmbeddedSignup() {
    if (!setup?.meta.embeddedSignupReady || !setup.meta.configId) {
      setMessage("Primero completá la configuración de Meta y las variables Preview indicadas abajo.");
      return;
    }

    const fb = (window as unknown as { FB?: FacebookSdk }).FB;
    if (!fb || !sdkReady) {
      setMessage("El SDK de Meta todavía no está listo. Reintentá en unos segundos.");
      return;
    }

    codeRef.current = "";
    assetsRef.current = null;
    setMessage("Abrimos Meta para autorizar la cuenta de WhatsApp Business…");

    fb.login(
      (response) => {
        const code = response.authResponse?.code?.trim();
        if (!code) {
          setMessage("Meta no devolvió el código de autorización.");
          return;
        }
        codeRef.current = code;
        void finishConnection();
      },
      {
        config_id: setup.meta.configId,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }

  async function copy(text: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado.");
    } catch {
      setMessage("No pude copiar automáticamente. Mantené presionado el texto para copiarlo.");
    }
  }

  if (!setup) {
    return (
      <section className={styles.card}>
        <h2>Conectar WhatsApp</h2>
        <p className={styles.muted}>Cargando configuración de Preview…</p>
        {message ? <div className={styles.warning}>{message}</div> : null}
      </section>
    );
  }

  const connected =
    setup.connection.status === "connected" &&
    setup.connection.phoneNumberId &&
    setup.connection.businessAccountId &&
    setup.connection.tokenStored;

  const configReady = setup.meta.embeddedSignupReady && setup.webhook.verifyTokenReady;
  const deliveryReady = connected && setup.connection.webhookEvents > 0;

  return (
    <div className={styles.pageStack}>
      <section className={styles.whatsappHero}>
        <div>
          <span className={styles.eyebrow}>WHATSAPP BUSINESS</span>
          <h2>{connected ? "WhatsApp conectado" : "Conectá WhatsApp al bot"}</h2>
          <p>
            {connected
              ? "MetaBot ya tiene la cuenta autorizada. Los mensajes reales pueden entrar al panel y usar el catálogo de este negocio."
              : "Vinculá la cuenta oficial de WhatsApp Business para recibir mensajes reales y responder automáticamente."}
          </p>
        </div>
        <span className={connected ? styles.channelConnected : setup.connection.status === "error" ? styles.channelError : styles.channelPending}>
          {connected ? "✓ Conectado" : setup.connection.status === "error" ? "Error" : "Pendiente"}
        </span>
      </section>

      {message ? <div className={styles.notice}>{message}</div> : null}
      {setup.connection.lastError ? (
        <div className={styles.warning}>Último error: {setup.connection.lastError}</div>
      ) : null}

      <section className={styles.connectionOverview}>
        <div className={styles.connectionPrimary}>
          <div className={styles.whatsappMark}>WA</div>
          <div>
            <span className={styles.eyebrow}>{setup.business.name}</span>
            <h3>{phoneNumber || "Número sin confirmar"}</h3>
            <p>
              {deliveryReady
                ? "Conexión comprobada con mensajes reales."
                : connected
                  ? "Cuenta autorizada. Falta recibir el primer mensaje real para completar la prueba."
                  : "Todavía no hay una cuenta de Meta autorizada para este negocio."}
            </p>
          </div>
        </div>

        <div className={styles.channelChecks}>
          <div className={phoneNumber ? styles.channelCheckDone : styles.channelCheck}>
            <span>{phoneNumber ? "✓" : "1"}</span>
            <div><strong>Número</strong><small>{phoneNumber ? "Confirmado" : "Falta confirmar"}</small></div>
          </div>
          <div className={configReady ? styles.channelCheckDone : styles.channelCheck}>
            <span>{configReady ? "✓" : "2"}</span>
            <div><strong>Meta</strong><small>{configReady ? "Preparado" : "Configuración pendiente"}</small></div>
          </div>
          <div className={connected ? styles.channelCheckDone : styles.channelCheck}>
            <span>{connected ? "✓" : "3"}</span>
            <div><strong>Autorización</strong><small>{connected ? "Cuenta vinculada" : "Falta conectar"}</small></div>
          </div>
          <div className={deliveryReady ? styles.channelCheckDone : styles.channelCheck}>
            <span>{deliveryReady ? "✓" : "4"}</span>
            <div><strong>Prueba real</strong><small>{deliveryReady ? "Webhook recibido" : "Esperando mensaje"}</small></div>
          </div>
        </div>
      </section>

      {!connected ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>PASO PRINCIPAL</span>
              <h3>Conectar la cuenta del negocio</h3>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Teléfono / WhatsApp</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+506 7000 0000"
              />
            </label>
          </div>

          <div className={styles.whatsappActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => void savePhone()} disabled={busy}>
              Guardar número
            </button>
            <button
              type="button"
              className={styles.whatsappButton}
              onClick={startEmbeddedSignup}
              disabled={busy || !setup.meta.embeddedSignupReady}
            >
              {busy ? "Conectando…" : "Conectar con Meta"}
            </button>
          </div>

          {!setup.meta.embeddedSignupReady ? (
            <div className={styles.setupNotice}>
              <strong>Falta una configuración interna antes de conectar.</strong>
              <span>Los detalles técnicos están abajo en “Diagnóstico avanzado”.</span>
            </div>
          ) : (
            <p className={styles.help}>Se abrirá Meta para autorizar la cuenta oficial de WhatsApp Business.</p>
          )}
        </section>
      ) : (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.eyebrow}>CONEXIÓN ACTIVA</span>
              <h3>Canal listo</h3>
            </div>
            <span className={styles.activeBadge}>Access Token cifrado</span>
          </div>

          <div className={styles.connectionGrid}>
            <div className={styles.connectionItem}>
              <strong>Mensajes reales recibidos</strong>
              <span>{setup.connection.webhookEvents}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>Última actividad</strong>
              <span>{setup.connection.lastWebhookAt ? new Date(setup.connection.lastWebhookAt).toLocaleString() : "Esperando primer mensaje"}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => void validateConnection()} disabled={busy}>
              Validar conexión
            </button>
            <button type="button" className={styles.dangerButton} onClick={() => void disconnect()} disabled={busy}>
              Desconectar
            </button>
          </div>
        </section>
      )}

      <section className={styles.card}>
        <span className={styles.eyebrow}>PRUEBA FINAL</span>
        <h3>{deliveryReady ? "Automatización comprobada" : "Enviar el primer mensaje real"}</h3>
        <p className={styles.help}>
          {deliveryReady
            ? "Meta ya entregó eventos reales a MetaBot. Podés revisar la conversación desde la pestaña Chats."
            : "Cuando el estado diga Conectado, escribí desde otro WhatsApp al número del negocio. El mensaje debe aparecer en Chats y el bot responder usando el catálogo."}
        </p>
      </section>

      <details className={styles.advancedDetails}>
        <summary>Diagnóstico avanzado</summary>
        <div className={styles.advancedBody}>
          <p className={styles.help}>
            Esta sección es para configuración técnica y solución de problemas. No hace falta usarla durante la operación normal.
          </p>

          <div className={styles.connectionGrid}>
            <div className={styles.connectionItem}>
              <strong>{setup.meta.appId ? "✓" : "○"} App ID</strong>
              <span>{setup.meta.appId ? "Configurado" : "Falta META_APP_ID"}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>{setup.meta.configId ? "✓" : "○"} Embedded Signup</strong>
              <span>{setup.meta.configId ? "Config ID listo" : "Falta META_WHATSAPP_CONFIG_ID"}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>{setup.meta.appSecretReady ? "✓" : "○"} App Secret</strong>
              <span>{setup.meta.appSecretReady ? "Configurado" : "Falta META_APP_SECRET"}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>{setup.meta.encryptionReady ? "✓" : "○"} Cifrado</strong>
              <span>{setup.meta.encryptionReady ? "Preparado" : "Falta WHATSAPP_CREDENTIALS_KEY"}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>Phone Number ID</strong>
              <span>{setup.connection.phoneNumberId ?? "Pendiente"}</span>
            </div>
            <div className={styles.connectionItem}>
              <strong>WABA ID</strong>
              <span>{setup.connection.businessAccountId ?? "Pendiente"}</span>
            </div>
          </div>

          <label className={styles.fullField}>
            <span>Callback URL</span>
            <div className={styles.copyRow}>
              <input readOnly value={setup.webhook.callbackUrl} />
              <button type="button" className={styles.secondaryButton} onClick={() => void copy(setup.webhook.callbackUrl)}>
                Copiar
              </button>
            </div>
          </label>

          <label className={styles.fullField}>
            <span>Verify token</span>
            <div className={styles.copyRow}>
              <input readOnly value={setup.webhook.verifyToken ?? "No disponible"} />
              <button type="button" className={styles.secondaryButton} onClick={() => void copy(setup.webhook.verifyToken)}>
                Copiar
              </button>
            </div>
          </label>

          {!setup.webhook.protectionBypassConfigured ? (
            <div className={styles.warning}>
              El Preview está protegido por Vercel. Meta necesita un bypass de automatización o una URL pública de webhook para entregar eventos.
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
