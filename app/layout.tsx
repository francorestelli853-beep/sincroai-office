// Forzar rendering dinámico en todas las páginas — el layout llama a Supabase
// y las env vars no están disponibles en build time de páginas estáticas.
export const dynamic = 'force-dynamic'

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { getAgents } from "@/lib/supabase";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SincroAI Virtual Office",
  description: "Centro de control de agentes de IA para SincroAI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch agents para el sidebar — refleja status real de Supabase en toda la app
  const agents = await getAgents();
  const sidebarAgents = agents.map((a) => ({
    id: a.id,
    emoji: a.avatar,
    name: a.name,
    status: a.status,
  }));

  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Sidebar agents={sidebarAgents} />
        {/* pt-14 on mobile to clear the fixed top bar; md:ml-60 for desktop sidebar */}
        <main className="min-h-screen p-4 pt-[72px] md:ml-60 md:p-8 md:pt-8">{children}</main>
      </body>
    </html>
  );
}
