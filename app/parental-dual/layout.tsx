import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parental Dual",
  description: "Panel privado de control familiar.",
  robots: { index: false, follow: false },
};

export default function ParentalDualLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
