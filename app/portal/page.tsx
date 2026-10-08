export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentPortalUser, requirePortalPreview } from "@/lib/portal/auth";

export default async function PortalHome() {
  requirePortalPreview();
  const user = await currentPortalUser();
  if (!user) redirect("/portal/login");
  const memberships = await db.businessUser.findMany({
    where: { userId: user.id, business: { status: "active" } },
    include: { business: { select: { id: true, name: true, country: true } } },
    orderBy: { business: { name: "asc" } },
  });
  return (
    <main style={{ maxWidth: 830, margin: "2rem auto", padding: "1.5rem" }}>
      <h1>Tu espacio en MetaBot CR</h1>
      <p>Accediste como {user.name || user.email}. Solo aparecen negocios a los que tenés acceso.</p>
      <form action="/api/portal/logout" method="post"><button type="submit">Cerrar sesión</button></form>
      <h2>Tus negocios</h2>
      {memberships.length === 0 ? (
        <p>No tenés ningún negocio activo asignado. Contactá a tu administrador.</p>
      ) : (
        <ul>
          {memberships.map(m => <li key={m.id}>
            <Link href={"/portal/business/" + encodeURIComponent(m.business.id)}>{m.business.name}</Link>
            {" — "}{m.role}{m.business.country ? " · " + m.business.country : ""}
          </li>)}
        </ul>
      )}
    </main>
  );
}
