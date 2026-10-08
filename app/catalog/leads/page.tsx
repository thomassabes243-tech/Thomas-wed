export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";

const SECTOR: Record<string,string> = {
  restaurante: "Restaurante", tienda: "Comercio", turismo: "Turismo",
  salon: "Salón/estética", servicios: "Servicios", otro: "Otro",
};
const INTEREST: Record<string,string> = {
  whatsapp: "Atención WhatsApp", automation: "Automatización", both: "Ambos",
};
const STATUS: Record<string,string> = {
  new: "Pendiente", contacted: "Contactado", closed: "Cerrado",
};

export default async function LeadsAdminPage() {
  if (!(await hasCatalogAdminSession())) redirect("/catalog/login");
  const leads = await db.salesLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, email: true, phone: true, company: true,
      sector: true, interest: true, message: true, status: true,
      consentedAt: true, createdAt: true,
    },
  });
  return (
    <main style={{maxWidth:1020,margin:"0 auto",padding:"28px 22px",lineHeight:1.5}}>
      <p><Link href="/catalog">← Centro de clientes</Link></p>
      <h1>Solicitudes comerciales recibidas</h1>
      <p>Estos datos provienen de formularios realmente guardados. Solo se muestran las
        últimas 100 solicitudes. No se envía ningún mensaje automáticamente.</p>
      {leads.length === 0 ? <p>No hay solicitudes registradas.</p> :
        leads.map(lead => (
          <article key={lead.id} style={{
            border:"1px solid #bacfc8",borderRadius:12,padding:20,margin:"20px 0",background:"#fff",
          }}>
            <h2>{lead.company}</h2>
            <p><strong>{lead.name}</strong> · {SECTOR[lead.sector] || lead.sector}</p>
            <p>Servicio: {INTEREST[lead.interest] || lead.interest}</p>
            <p>Correo: <a href={"mailto:" + lead.email}>{lead.email}</a></p>
            {lead.phone && <p>Teléfono: {lead.phone}</p>}
            <p style={{whiteSpace:"pre-wrap"}}>{lead.message}</p>
            <p>Fecha: {lead.createdAt.toLocaleString("es-CR",{timeZone:"America/Costa_Rica"})}</p>
            <p>Consentimiento: {lead.consentedAt.toLocaleString("es-CR",{timeZone:"America/Costa_Rica"})}</p>
            <form method="post" action="/api/catalog/leads/status" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <input type="hidden" name="id" value={lead.id} />
              <label>Estado
                <select name="status" defaultValue={lead.status}
                  style={{marginLeft:8,padding:8}}>
                  {Object.entries(STATUS).map(([key,value])=><option key={key} value={key}>{value}</option>)}
                </select>
              </label>
              <button type="submit" style={{padding:"10px 16px"}}>Guardar estado</button>
            </form>
          </article>
        ))
      }
    </main>
  );
}
