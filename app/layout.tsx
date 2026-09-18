import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://metabot-cr.vercel.app"),
  title: "Bot WhatsApp con IA Costa Rica | MetaBot CR",
  description: "Automatizá WhatsApp en tu negocio con MetaBot CR. Explorá la demo y calculá tu inversión. Instalación de inteligencia artificial para empresas por separado.",
  alternates: { canonical: "/" },
  openGraph: {title:"MetaBot CR | Bot WhatsApp con IA para tu negocio",description:"Menos consultas pendientes, más tiempo para tu negocio. Probá la demo y calculá un escenario de recuperación de inversión.",url:"/",locale:"es_CR",type:"website",siteName:"MetaBot CR"},
  twitter: {card:"summary",title:"MetaBot CR | Bots e IA para empresas",description:"Bot WhatsApp e instalación de IA: dos servicios independientes para tu negocio."},
  robots: { index:true, follow:true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
