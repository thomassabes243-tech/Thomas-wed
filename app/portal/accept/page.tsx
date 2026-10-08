import { db } from "@/lib/db";
import { currentPortalUser, requirePortalPreview } from "@/lib/portal/auth";
import { isPortalToken, portalTokenHash } from "@/lib/portal/auth-core";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aceptar invitación | MetaBot CR",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AcceptInvite({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  requirePortalPreview();
  const { token } = await searchParams;
  const invite = isPortalToken(token)
    ? await db.portalInvite.findUnique({
        where: { tokenHash: portalTokenHash(token) },
        include: { business: { select: { name: true, status: true } } },
      })
    : null;
  const valid = Boolean(invite && !invite.usedAt && invite.expiresAt > new Date() && invite.business.status === "active");
  const account = valid && invite
    ? await db.user.findUnique({ where: { email: invite.email }, select: { id: true, passwordHash: true } })
    : null;
  const session = await currentPortalUser();
  const mustLogin = Boolean(account?.passwordHash && session?.id !== account.id);
  return (
    <main style={{ maxWidth: 530, margin: "3rem auto", padding: "1.5rem" }}>
      <h1>Invitación a MetaBot CR</h1>
      {!valid || !invite ? (
        <p role="alert">Esta invitación no existe, fue utilizada o ya venció. Solicitá una nueva.</p>
      ) : (
        <>
          <p>Empresa: <strong>{invite.business.name}</strong></p>
          <p>Cuenta: {invite.email}</p>
          <p>Permiso: {invite.role}</p>
          {mustLogin ? (
            <p>Esta dirección ya tiene una cuenta. <a href="/portal/login">Iniciá sesión</a> y después abrí nuevamente este enlace para aceptar la invitación.</p>
          ) : (
            <form action="/api/portal/invites/accept" method="post">
              <input type="hidden" name="token" value={token} />
              {!account?.passwordHash && (
                <>
                  <label>Nombre
                    <input type="text" name="name" maxLength={100} autoComplete="name" required />
                  </label>
                  <label>Creá una contraseña de al menos 12 caracteres
                    <input type="password" name="password" minLength={12} maxLength={128} autoComplete="new-password" required />
                  </label>
                </>
              )}
              <button type="submit">Aceptar y entrar</button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
