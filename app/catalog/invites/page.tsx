export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";
import PortalInviteForm from "@/components/portal-invite-form";

export default async function OperatorInvitations() {
  if (!(await hasCatalogAdminSession())) redirect("/catalog/login");
  const businesses = await db.business.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "1.5rem" }}>
      <p><Link href="/catalog">← Centro de clientes</Link></p>
      <h1>Alta de clientes — entorno de pruebas</h1>
      <p>El panel utiliza invitaciones de un solo uso. Solo el operador puede emitir la primera invitación de un negocio.</p>
      {businesses.length ? (
        <PortalInviteForm businesses={businesses} roles={["owner", "admin", "agent"]} />
      ) : <p>Primero creá un negocio en el panel administrativo.</p>}
    </main>
  );
}
