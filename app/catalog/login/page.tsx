import { redirect } from "next/navigation";
import {
  hasCatalogAdminSession,
  isCatalogOperatorConfigured,
} from "@/lib/catalog/admin-session";
import styles from "../catalog.module.css";

export default async function CatalogLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasCatalogAdminSession()) redirect("/catalog");
  const params = await searchParams;
  const configured = isCatalogOperatorConfigured();

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.kicker}>METABOT CR · ADMINISTRACIÓN</div>
        <h1>Acceso administrativo</h1>
        <p className={styles.muted}>
          Panel de configuración técnica reservado a operadores en entornos de pruebas.
          El acceso por cliente se habilitará tras completar autenticación multiempresa.
        </p>
        {!configured ? (
          <p className={styles.error} role="status">
            Acceso no disponible. El operador debe configurar credenciales seguras
            en Preview. El inicio de sesión de clientes aún no está habilitado.
          </p>
        ) : (
          <>
            {params.error ? <p className={styles.error} role="alert">No se pudo iniciar sesión.</p> : null}
            <form action="/api/catalog/login" method="post" className={styles.stack}>
              <label className={styles.field}>
                <span>Clave administrativa de pruebas</span>
                <input name="password" type="password" required autoComplete="current-password" />
              </label>
              <button className={styles.primaryButton} type="submit">
                Entrar a MetaBot CR
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
