import { redirect } from "next/navigation";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";
import styles from "../catalog.module.css";

export default async function CatalogLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasCatalogAdminSession()) redirect("/catalog");
  const params = await searchParams;

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.kicker}>METABOT CR · ADMINISTRACIÓN</div>
        <h1>Acceso administrativo</h1>
        <p className={styles.muted}>
          Entrá al panel donde administrás tus clientes y configurás el bot de cada negocio.
        </p>
        {params.error ? <p className={styles.error}>Clave incorrecta.</p> : null}
        <form action="/api/catalog/login" method="post" className={styles.stack}>
          <label className={styles.field}>
            <span>Clave administrativa</span>
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className={styles.primaryButton} type="submit">
            Entrar a MetaBot CR
          </button>
        </form>
      </section>
    </main>
  );
}
