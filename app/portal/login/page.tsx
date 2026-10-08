export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { currentPortalUser, requirePortalPreview } from "@/lib/portal/auth";

export default async function PortalLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; inviteError?: string }>;
}) {
  requirePortalPreview();
  if (await currentPortalUser()) redirect("/portal");
  const params = await searchParams;
  return (
    <main style={{ maxWidth: 500, margin: "3rem auto", padding: "1.5rem" }}>
      <h1>MetaBot CR — Portal de clientes</h1>
      <p>Acceso individual de prueba, disponible únicamente para cuentas invitadas.</p>
      {(params.error || params.inviteError) && (
        <p role="alert">No fue posible iniciar sesión o validar la invitación. Verificá tus datos o consultá al administrador.</p>
      )}
      <form action="/api/portal/login" method="post">
        <label>Correo electrónico
          <input name="email" type="email" maxLength={254} required autoComplete="email" />
        </label>
        <label>Contraseña
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Entrar al portal</button>
      </form>
      <p>¿No tenés una cuenta? Solicitá una invitación al administrador de tu negocio.</p>
    </main>
  );
}
