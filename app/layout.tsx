import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaBot | Bots e IA para empresas",
  description: "Bots para WhatsApp e instalación de inteligencia artificial para empresas de Latinoamérica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
