import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SincroAI Virtual Office",
  description: "Centro de control de agentes de IA para SincroAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Sidebar />
        {/* pt-14 on mobile to clear the fixed top bar; md:ml-60 for desktop sidebar */}
        <main className="min-h-screen p-4 pt-[72px] md:ml-60 md:p-8 md:pt-8">{children}</main>
      </body>
    </html>
  );
}
