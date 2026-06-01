import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juanser CRM",
  description: "CRM operativo para gestionar clientes y trabajos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
