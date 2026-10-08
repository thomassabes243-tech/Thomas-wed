"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "./lead-form.module.css";

const initial = {
  name: "", company: "", email: "", phone: "",
  sector: "restaurante", interest: "whatsapp", message: "",
  consent: false, website: "",
};

export default function SalesLeadForm({ enabled }: { enabled: boolean }) {
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || sending) return;
    setSending(true);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: { accepted?: boolean; error?: string; message?: string } = await response.json();
      if (!response.ok || data.accepted !== true) {
        throw new Error(data.error || "No se pudo registrar la solicitud.");
      }
      setResult(data.message || "Solicitud registrada. Nuestro equipo deberá revisar el contacto.");
      setCompleted(true);
      setForm(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setSending(false);
    }
  }

  if (!enabled) {
    return (
      <div className={styles.unavailable} role="status">
        <h3>Solicitudes en preparación</h3>
        <p>Estamos terminando la conexión de formularios y el seguimiento comercial.
          La recepción de solicitudes no está activada todavía.</p>
        <a href="#demo">Mientras tanto, podés probar la demostración gratuita.</a>
      </div>
    );
  }

  if (completed) {
    return (
      <div className={styles.confirmation} role="status" aria-live="polite">
        <h3>Solicitud recibida</h3>
        <p>{result}</p>
        <p>No se ha contratado ni activado ningún servicio.</p>
        <button type="button" onClick={() => { setCompleted(false); setResult(""); }}>
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row}>
        <label>Tu nombre
          <input required autoComplete="name" maxLength={100} minLength={2}
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </label>
        <label>Negocio o empresa
          <input required autoComplete="organization" maxLength={150} minLength={2}
            value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
        </label>
      </div>
      <div className={styles.row}>
        <label>Correo electrónico
          <input required type="email" autoComplete="email" maxLength={254}
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </label>
        <label>Teléfono (opcional)
          <input type="tel" autoComplete="tel" maxLength={40}
            value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </label>
      </div>
      <div className={styles.row}>
        <label>Tipo de negocio
          <select required value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}>
            <option value="restaurante">Restaurante o cafetería</option>
            <option value="tienda">Tienda o comercio</option>
            <option value="turismo">Turismo u hospedaje</option>
            <option value="salon">Salón, barbería o estética</option>
            <option value="servicios">Servicios profesionales</option>
            <option value="otro">Otro negocio</option>
          </select>
        </label>
        <label>¿Qué necesitás?
          <select required value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value }))}>
            <option value="whatsapp">Atención por WhatsApp</option>
            <option value="automation">Automatizar un proceso</option>
            <option value="both">Ambos servicios</option>
          </select>
        </label>
      </div>
      <label>Contanos cómo atendés actualmente
        <textarea required minLength={10} maxLength={2000} rows={4}
          placeholder="Por ejemplo: recibimos muchas consultas sobre precios y horarios..."
          value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
      </label>
      <label className={styles.consent}>
        <input type="checkbox" checked={form.consent} required
          onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))} />
        <span>Autorizo que MetaBot CR conserve estos datos para responder mi solicitud comercial.
          Leí la <Link href="/privacidad">información sobre privacidad</Link>.</span>
      </label>
      <div className={styles.honeypot} aria-hidden="true">
        <label>Dejá este campo vacío
          <input type="text" tabIndex={-1} autoComplete="off"
            value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
        </label>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={sending || !form.consent}>
        {sending ? "Registrando solicitud..." : "Enviar solicitud"}
      </button>
      <small>El envío solicita contacto comercial. No activa WhatsApp, IA ni genera pagos.</small>
    </form>
  );
}
