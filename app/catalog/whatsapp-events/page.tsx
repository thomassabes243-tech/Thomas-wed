export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";

export default async function WhatsAppEventReview() {
  if (!(await hasCatalogAdminSession())) redirect("/catalog/login");

  const events = await db.webhookEvent.findMany({
    where: { status: { in: ["failed", "needs_review", "ready", "preparing", "sending"] } },
    orderBy: { receivedAt: "desc" },
    take: 100,
    select: {
      eventId: true, businessId: true, status: true, deliveryState: true,
      attemptCount: true, lastError: true, receivedAt: true,
      claimExpiresAt: true, outboundMessageId: true,
    },
  });
  const color: Record<string, string> = {
    needs_review: "#9a4b17",
    failed: "#b42318",
    ready: "#1458a4",
    preparing: "#6c57a2",
    sending: "#6c57a2",
  };

  return (
    <main style={{maxWidth: 1000, margin: "0 auto", padding: "28px 20px", lineHeight: 1.55}}>
      <p><Link href="/catalog">← Panel técnico</Link></p>
      <h1>Mensajes WhatsApp que necesitan seguimiento</h1>
      <p>Consulta de eventos reales registrados en la base de datos. Esta página no reenvía mensajes
        ni modifica el estado remoto. Un envío incierto debe verificarse en Meta antes de cualquier decisión.</p>
      <p>Mostrando hasta 100 eventos pendientes o con problemas. Los mensajes entregados no aparecen aquí.</p>
      {!events.length && <p>No hay eventos que requieran atención actualmente.</p>}
      {events.map(e => (
        <article key={e.eventId} style={{
          border: "1px solid #cdd9d4", borderRadius: 9,
          padding: 18, marginTop: 15, background: "#fff",
        }}>
          <h2 style={{fontSize: 18, margin: "0 0 8px"}}>Negocio: {e.businessId ?? "Sin asociar"}</h2>
          <p style={{fontWeight: 700, color: color[e.status] ?? "#333"}}>
            Estado: {e.status} · entrega: {e.deliveryState}
          </p>
          <p>ID del mensaje: <code style={{overflowWrap: "anywhere"}}>{e.eventId}</code></p>
          <p>Recibido: {e.receivedAt.toISOString()} · intentos de preparación: {e.attemptCount}</p>
          {e.claimExpiresAt && <p>Reserva de procesamiento hasta: {e.claimExpiresAt.toISOString()}</p>}
          {e.outboundMessageId && <p>ID de respuesta confirmado: {e.outboundMessageId}</p>}
          {e.lastError && <p>Diagnóstico técnico: {e.lastError}</p>}
          {e.deliveryState === "uncertain" && (
            <p><strong>Revisión obligatoria:</strong> existe riesgo de que la respuesta haya llegado
              a Meta aunque no se confirmara en nuestra base. No ejecutar reenvíos ciegos.</p>
          )}
        </article>
      ))}
    </main>
  );
}
