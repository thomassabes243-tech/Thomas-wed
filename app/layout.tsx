import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://metabot-cr.vercel.app"),
  title: "MetaBot CR | Inteligencia artificial y automatización para empresas",
  description: "MetaBot CR desarrolla e implementa soluciones de inteligencia artificial, automatización y WhatsApp IA para negocios en crecimiento de Costa Rica y Centroamérica.",
  alternates: { canonical: "/" },
  openGraph: {title:"MetaBot CR | Inteligencia artificial para empresas",description:"Soluciones de automatización, WhatsApp IA e implementación de inteligencia artificial para negocios en crecimiento.",url:"/",locale:"es_CR",type:"website",siteName:"MetaBot CR"},
  twitter: {card:"summary",title:"MetaBot CR | IA y automatización para empresas",description:"WhatsApp IA e instalación de inteligencia artificial: dos servicios empresariales independientes."},
  robots: { index:true, follow:true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
