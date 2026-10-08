"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InboxActions({
  businessId, conversationId, status, assignmentId, myMembershipId, elevated,
}: {
  businessId: string;
  conversationId: string;
  status: string;
  assignmentId: string | null;
  myMembershipId: string;
  elevated: boolean;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const mine = assignmentId === myMembershipId;
  const open = status !== "closed";
  const takeAllowed = open && (!assignmentId || mine);
  const resolveAllowed = open && (elevated || mine);
  const actions = [
    ...(takeAllowed && !mine ? [{ key: "take", label: "Tomar conversación" }] : []),
    ...(resolveAllowed && assignmentId ? [{ key: "release", label: "Liberar" }] : []),
    ...(resolveAllowed ? [{ key: "close", label: "Cerrar" }] : []),
    ...(!open && elevated ? [{ key: "reopen", label: "Reabrir" }] : []),
  ] as const;

  async function execute(action: string) {
    if (working) return;
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        "/api/portal/businesses/" + encodeURIComponent(businessId) + "/conversations",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, action }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.conversation?.id) {
        throw new Error(data.error || "No se pudo cambiar la conversación.");
      }
      setSuccess("Estado actualizado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}>
      {actions.map(a => (
        <button key={a.key} disabled={working} type="button"
          onClick={() => void execute(a.key)}
          style={{padding:"9px 13px",minHeight:44,border:"1px solid #6c8c7d",borderRadius:7,
            background:"#fff",cursor:working?"wait":"pointer",color:"#17382d"}}>
          {working ? "Guardando..." : a.label}
        </button>
      ))}
      {!actions.length && <span>No hay acciones disponibles con tu permiso o el estado actual.</span>}
      {error && <p role="alert" style={{width:"100%",color:"#aa2020"}}>{error}</p>}
      {success && <p role="status" style={{width:"100%"}}>{success}</p>}
    </div>
  );
}
