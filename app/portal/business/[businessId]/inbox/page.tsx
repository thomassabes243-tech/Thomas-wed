export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePortalBusiness } from "@/lib/portal/auth";
import InboxActions from "@/components/inbox-actions";

export const metadata: Metadata = {
  title: "Conversaciones | MetaBot CR",
  robots: { index: false, follow: false },
};

const filters = [
  { key: "all", title: "Todas" },
  { key: "human_required", title: "Atención humana" },
  { key: "open", title: "Abiertas" },
  { key: "waiting", title: "En espera" },
  { key: "closed", title: "Cerradas" },
] as const;

export default async function TenantInbox({
  params, searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { businessId } = await params;
  const { status } = await searchParams;
  const { membership } = await requirePortalBusiness(businessId, "read");
  const filter = filters.find(f => f.key === status)?.key ?? "all";
  const entries = await db.conversation.findMany({
    where: { businessId, ...(filter !== "all" ? { status: filter } : {}) },
    orderBy: { lastMessageAt: "desc" }, take: 50,
    include: {
      customer: { select: { name: true, whatsappNumber: true } },
      assignedBusinessUser: { include: { user: { select: { name: true, email: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 12,
        select: { id: true, direction: true, content: true, createdAt: true } },
    },
  });
  const elevated = membership.role === "owner" || membership.role === "admin";

  return (
    <main style={{maxWidth:1000,margin:"0 auto",padding:"25px 18px",lineHeight:1.55}}>
      <p><Link href={"/portal/business/" + encodeURIComponent(businessId)}>
        ← Volver al negocio
      </Link></p>
      <h1>Bandeja de conversaciones</h1>
      <p>Negocio: <strong>{membership.business.name}</strong> · Perfil: {membership.role}.</p>
      <p>Estos son mensajes reales guardados para este negocio. Podés tomar,
        liberar y cerrar conversaciones según tus permisos. La respuesta manual
        por WhatsApp todavía requiere completar la integración oficial.</p>
      <nav aria-label="Filtrar conversaciones" style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {filters.map(f => (
          <Link key={f.key} href={f.key === "all"
            ? "/portal/business/" + encodeURIComponent(businessId) + "/inbox"
            : "/portal/business/" + encodeURIComponent(businessId) + "/inbox?status=" + f.key}
            aria-current={filter === f.key ? "page" : undefined}>
            {f.title}
          </Link>
        ))}
      </nav>
      <p>Se muestran como máximo 50 conversaciones, ordenadas por actividad reciente.</p>
      {!entries.length && <p>No hay conversaciones registradas para este filtro.</p>}
      {entries.map(chat => (
        <article key={chat.id} style={{
          border:"1px solid #d4e2db",borderRadius:12,padding:20,marginTop:20,
          background:"#fff",overflowWrap:"anywhere",
        }}>
          <h2 style={{fontSize:20}}>
            {chat.customer.name || chat.customer.whatsappNumber || "Cliente sin nombre"}
          </h2>
          <p>Estado: <strong>{chat.status}</strong> · Prioridad: {chat.priority}</p>
          <p>Asignada a: {chat.assignedBusinessUser
            ? (chat.assignedBusinessUser.user.name || chat.assignedBusinessUser.user.email)
            : "Sin asignar"}</p>
          <p>Última actividad: {chat.lastMessageAt.toLocaleString("es-CR",{
            timeZone: membership.business.country === "Nicaragua"
              ? "America/Managua" : "America/Costa_Rica",
          })}</p>
          <InboxActions businessId={businessId} conversationId={chat.id}
            status={chat.status} assignmentId={chat.assignedBusinessUserId}
            myMembershipId={membership.id} elevated={elevated} />
          <details>
            <summary>Ver últimos mensajes guardados ({chat.messages.length})</summary>
            {[...chat.messages].reverse().map(message => (
              <div key={message.id} style={{padding:"9px 0",borderBottom:"1px solid #e4e9e6"}}>
                <small>{message.direction === "inbound" ? "Cliente" : "Salida registrada"}
                  {" · "}{message.createdAt.toISOString()}</small>
                <p style={{whiteSpace:"pre-wrap"}}>{message.content}</p>
              </div>
            ))}
            {!chat.messages.length && <p>Todavía no hay mensajes guardados.</p>}
          </details>
        </article>
      ))}
    </main>
  );
}
