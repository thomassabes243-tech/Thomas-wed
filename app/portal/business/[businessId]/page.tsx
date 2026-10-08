export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { portalRoleAllows } from "@/lib/portal/auth-core";
import { requirePortalBusiness } from "@/lib/portal/auth";
import PortalInviteForm from "@/components/portal-invite-form";

export default async function BusinessPortalPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { membership } = await requirePortalBusiness(businessId);
  const [products, conversations, human, totalProducts] = await Promise.all([
    db.product.findMany({
      where: { businessId, active: true },
      select: { id: true, name: true, price: true, category: true },
      take: 20, orderBy: { name: "asc" },
    }),
    db.conversation.count({ where: { businessId } }),
    db.conversation.count({ where: { businessId, status: "human_required" } }),
    db.product.count({ where: { businessId, active: true } }),
  ]);
  return (
    <main style={{ maxWidth: 830, margin: "2rem auto", padding: "1.5rem" }}>
      <p><Link href="/portal">← Mis negocios</Link></p>
      <h1>{membership.business.name}</h1>
      <p>Acceso: {membership.role} · Datos reales del catálogo y las conversaciones guardadas.</p>
      <section>
        <h2>Resumen</h2>
        <p>Productos activos: {totalProducts}</p>
        <p>Conversaciones registradas: {conversations}</p>
        <p>Conversaciones que requieren una persona: {human}</p>
      </section>
      <section>
        <h2>Primeros productos del catálogo</h2>
        {products.length ? (
          <ul>{products.map(p => <li key={p.id}>
            {p.name}{p.category ? " · " + p.category : ""}{p.price === null ? "" : " · " + p.price.toString()}
          </li>)}</ul>
        ) : <p>No hay productos activos registrados.</p>}
        {totalProducts > 20 && <p>Mostrando los primeros 20 productos.</p>}
      </section>
      {portalRoleAllows(membership.role, "invite") && (
        <PortalInviteForm businesses={[{ id: businessId, name: membership.business.name }]}
          roles={membership.role === "owner" ? ["owner", "admin", "agent"] : ["agent"]} />
      )}
      <p>Este portal de clientes está en pruebas. La administración avanzada sigue restringida al operador hasta terminar las verificaciones de permisos.</p>
    </main>
  );
}
