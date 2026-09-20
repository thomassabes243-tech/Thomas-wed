import { redirect } from "next/navigation";
import { hasCatalogAdminSession } from "@/lib/catalog/admin-session";
import CatalogManager from "@/components/catalog-manager";
import styles from "./catalog.module.css";

export default async function CatalogPage() {
  if (!(await hasCatalogAdminSession())) redirect("/catalog/login");

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>METABOT CR · CLIENTES Y BOTS</div>
          <h1>Centro de clientes</h1>
          <p className={styles.muted}>Creá negocios, configurá su bot, cargá información y probalo antes de conectarlo a WhatsApp.</p>
        </div>
        <form action="/api/catalog/logout" method="post">
          <button className={styles.secondaryButton} type="submit">Salir</button>
        </form>
      </header>
      <CatalogManager previewOnly={process.env.VERCEL_ENV === "preview"} />
    </main>
  );
}
