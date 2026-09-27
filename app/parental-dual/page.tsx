"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./parental.module.css";

type Device = {
  id: string;
  email: string;
  name: string;
  paired: boolean;
  last_seen_at: string | null;
};

type ParentNotification = {
  id: string;
  app_name: string;
  title: string | null;
  body: string | null;
  created_at: string;
};

type MediaState = {
  id: string;
  status: string;
  dataBase64: string | null;
  mime: string | null;
  updatedAt: string | null;
} | null;

export default function ParentalDualPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [pairCode, setPairCode] = useState("");
  const [screen, setScreen] = useState<MediaState>(null);
  const [audio, setAudio] = useState<MediaState>(null);
  const [message, setMessage] = useState("Ingresá tu clave de administrador.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("parentalAdminKey");
    if (saved) setAdminKey(saved);
  }, []);

  const headers = useMemo(() => ({
    "content-type": "application/json",
    "x-admin-key": adminKey,
  }), [adminKey]);

  const loadDevices = useCallback(async () => {
    if (!adminKey) return;
    const response = await fetch("/api/parental/admin/devices", { headers, cache: "no-store" });
    if (!response.ok) {
      setMessage(response.status === 401 ? "Clave incorrecta." : "No se pudo consultar el servidor.");
      return;
    }
    const data = await response.json();
    setAdminEmail(data.adminEmail || "");
    setDevices(data.devices || []);
    if (!selectedId && data.devices?.length) setSelectedId(data.devices[0].id);
    setMessage("Panel conectado.");
  }, [adminKey, headers, selectedId]);

  const loadNotifications = useCallback(async () => {
    if (!adminKey || !selectedId) return;
    const response = await fetch("/api/parental/admin/notifications?deviceId=" + encodeURIComponent(selectedId), {
      headers,
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      setNotifications(data.notifications || []);
    }
  }, [adminKey, headers, selectedId]);

  const loadMedia = useCallback(async () => {
    if (!adminKey || !selectedId) return;
    const [screenRes, audioRes] = await Promise.all([
      fetch("/api/parental/admin/media?kind=screen&deviceId=" + encodeURIComponent(selectedId), { headers, cache: "no-store" }),
      fetch("/api/parental/admin/media?kind=audio&deviceId=" + encodeURIComponent(selectedId), { headers, cache: "no-store" }),
    ]);
    if (screenRes.ok) setScreen((await screenRes.json()).session || null);
    if (audioRes.ok) setAudio((await audioRes.json()).session || null);
  }, [adminKey, headers, selectedId]);

  useEffect(() => {
    if (!adminKey) return;
    void loadDevices();
    const timer = window.setInterval(() => void loadDevices(), 5000);
    return () => window.clearInterval(timer);
  }, [adminKey, loadDevices]);

  useEffect(() => {
    if (!selectedId || !adminKey) return;
    void loadNotifications();
    void loadMedia();
    const timer = window.setInterval(() => {
      void loadNotifications();
      void loadMedia();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selectedId, adminKey, loadNotifications, loadMedia]);

  function login(event: React.FormEvent) {
    event.preventDefault();
    const value = keyDraft.trim();
    if (!value) return;
    sessionStorage.setItem("parentalAdminKey", value);
    setAdminKey(value);
    setKeyDraft("");
  }

  async function pairDevice(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(pairCode)) {
      setMessage("El código debe tener 6 números.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/parental/admin/pair", {
      method: "POST",
      headers,
      body: JSON.stringify({ code: pairCode }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error === "invalid_or_expired_code" ? "Código inválido o vencido." : "No se pudo vincular.");
      return;
    }
    setPairCode("");
    setMessage("Dispositivo vinculado.");
    await loadDevices();
  }

  async function session(kind: "audio" | "screen", action: "start" | "stop") {
    if (!selectedId) return;
    setBusy(true);
    const response = await fetch("/api/parental/admin/session", {
      method: "POST",
      headers,
      body: JSON.stringify({ deviceId: selectedId, kind, action }),
    });
    setBusy(false);
    setMessage(response.ok
      ? (action === "start" ? "Solicitud enviada. El teléfono debe autorizarla." : "Solicitud de cierre enviada.")
      : "No se pudo enviar la solicitud.");
    await loadMedia();
  }

  function logout() {
    sessionStorage.removeItem("parentalAdminKey");
    setAdminKey("");
    setDevices([]);
    setNotifications([]);
    setSelectedId("");
    setMessage("Sesión cerrada.");
  }

  if (!adminKey) {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard}>
          <div className={styles.logo}>PD</div>
          <p className={styles.kicker}>PARENTAL DUAL</p>
          <h1>Panel privado del tutor</h1>
          <p>La clave se guarda solo durante esta sesión del navegador.</p>
          <form onSubmit={login} className={styles.stack}>
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Clave de administrador"
              autoComplete="current-password"
            />
            <button type="submit">Entrar</button>
          </form>
          <small>{message}</small>
        </section>
      </main>
    );
  }

  const selected = devices.find((device) => device.id === selectedId) || null;
  const screenSrc = screen?.dataBase64 && screen.mime ? "data:" + screen.mime + ";base64," + screen.dataBase64 : "";
  const audioSrc = audio?.dataBase64 && audio.mime ? "data:" + audio.mime + ";base64," + audio.dataBase64 : "";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>PARENTAL DUAL</p>
          <h1>Control familiar</h1>
          <small>Administrador: {adminEmail || "verificando..."}</small>
        </div>
        <button className={styles.secondary} onClick={logout}>Salir</button>
      </header>

      <section className={styles.notice}>
        Audio y pantalla solo se activan cuando el teléfono supervisado acepta la solicitud. La app mantiene indicadores visibles mientras están activos.
      </section>

      <div className={styles.grid}>
        <aside className={styles.card}>
          <h2>Dispositivos</h2>
          <form onSubmit={pairDevice} className={styles.pairRow}>
            <input
              inputMode="numeric"
              maxLength={6}
              value={pairCode}
              onChange={(e) => setPairCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código 6 dígitos"
            />
            <button disabled={busy}>Vincular</button>
          </form>
          <div className={styles.deviceList}>
            {devices.length === 0 && <p className={styles.empty}>Todavía no hay dispositivos.</p>}
            {devices.map((device) => {
              const online = device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < 30000;
              return (
                <button
                  key={device.id}
                  className={device.id === selectedId ? styles.deviceActive : styles.device}
                  onClick={() => setSelectedId(device.id)}
                >
                  <strong>{device.name}</strong>
                  <span>{device.email}</span>
                  <small>{online ? "● Conectado" : "○ Sin conexión"} · {device.paired ? "Vinculado" : "Pendiente"}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.card}>
          <h2>{selected ? selected.name : "Seleccioná un dispositivo"}</h2>
          {selected && (
            <>
              <div className={styles.actions}>
                <button onClick={() => session("audio", "start")} disabled={busy}>Solicitar audio</button>
                <button className={styles.secondary} onClick={() => session("audio", "stop")} disabled={busy}>Detener audio</button>
                <button onClick={() => session("screen", "start")} disabled={busy}>Solicitar pantalla</button>
                <button className={styles.secondary} onClick={() => session("screen", "stop")} disabled={busy}>Detener pantalla</button>
              </div>
              <p className={styles.status}>{message}</p>

              <div className={styles.mediaGrid}>
                <article>
                  <div className={styles.mediaHead}>
                    <h3>Pantalla</h3>
                    <span>{screen?.status || "sin sesión"}</span>
                  </div>
                  <div className={styles.screenBox}>
                    {screenSrc ? <img src={screenSrc} alt="Pantalla compartida del dispositivo" /> : <p>Esperando autorización y primera imagen.</p>}
                  </div>
                </article>
                <article>
                  <div className={styles.mediaHead}>
                    <h3>Audio</h3>
                    <span>{audio?.status || "sin sesión"}</span>
                  </div>
                  <div className={styles.audioBox}>
                    {audioSrc ? <audio key={audio?.updatedAt || undefined} controls autoPlay src={audioSrc} /> : <p>Esperando autorización y primer fragmento.</p>}
                  </div>
                </article>
              </div>
            </>
          )}
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.mediaHead}>
          <h2>Notificaciones</h2>
          <span>{notifications.length} recientes</span>
        </div>
        <div className={styles.notifications}>
          {notifications.length === 0 && <p className={styles.empty}>No hay notificaciones recibidas.</p>}
          {notifications.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.app_name}</strong>
                <time>{new Date(item.created_at).toLocaleString()}</time>
              </div>
              {item.title && <h3>{item.title}</h3>}
              {item.body && <p>{item.body}</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
