"use client";
import { useState, type FormEvent } from "react";

type Role = "owner" | "admin" | "agent";
type BusinessOption = { id: string; name: string };
export default function PortalInviteForm({
  businesses,
  roles,
}: {
  businesses: BusinessOption[];
  roles: Role[];
}) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles.includes("agent") ? "agent" : roles[0]);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLink("");
    setError("");
    try {
      const result = await fetch("/api/portal/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, email, role }),
        credentials: "same-origin",
      });
      const data = await result.json();
      if (!result.ok || typeof data.inviteUrl !== "string") {
        throw new Error(data.error || "No fue posible crear la invitación.");
      }
      setLink(data.inviteUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la invitación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Invitar a una persona">
      <h2>Invitar a una persona</h2>
      <p>Generá un enlace de acceso que vence a las 48 horas. Se muestra una sola vez.</p>
      <form onSubmit={submit}>
        <label>
          Negocio
          <select value={businessId} onChange={e => setBusinessId(e.target.value)} required>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label>
          Correo de la persona
          <input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          Permiso
          <select value={role} onChange={e => setRole(e.target.value as Role)}>
            {roles.map(r => <option key={r} value={r}>{r === "owner" ? "Propietario" : r === "admin" ? "Administrador" : "Agente"}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy || !businessId}>{busy ? "Generando..." : "Crear invitación"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {link && (
        <div aria-live="polite">
          <p>Invitación creada. Compartí el enlace por un canal seguro y solo con la persona indicada.</p>
          <label>Enlace de un solo uso
            <textarea value={link} readOnly rows={4} onFocus={e => e.target.select()} />
          </label>
        </div>
      )}
    </section>
  );
}
