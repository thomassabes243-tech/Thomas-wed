import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaBot CR",
  description: "Asistente de WhatsApp para negocios de Costa Rica",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
