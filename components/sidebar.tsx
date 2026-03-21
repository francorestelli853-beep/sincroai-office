"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Terminal,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agentes", icon: Bot },
  { href: "/control", label: "Control", icon: Terminal },
  { href: "/activity", label: "Actividad", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">SincroAI</p>
          <p className="text-xs text-gray-500">Virtual Office</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
          Navegación
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-violet-400" : "text-gray-500"
                    )}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Agents quick access */}
        <div className="mt-6">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
            Agentes
          </p>
          <ul className="space-y-0.5">
            {[
              { id: "outreach", emoji: "🎯", name: "Outreach", status: "active" },
              { id: "ventas", emoji: "🤝", name: "Ventas", status: "working" },
              { id: "onboarding", emoji: "⚙️", name: "Onboarding", status: "idle" },
              { id: "web-builder", emoji: "🌐", name: "Web Builder", status: "working" },
              { id: "reportes", emoji: "📊", name: "Reportes", status: "idle" },
              { id: "soporte", emoji: "🛠️", name: "Soporte", status: "active" },
            ].map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === `/agents/${agent.id}`
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-gray-500 hover:bg-gray-800/40 hover:text-gray-300"
                  )}
                >
                  <span className="text-base">{agent.emoji}</span>
                  <span className="truncate">{agent.name}</span>
                  <span
                    className={cn(
                      "ml-auto h-2 w-2 rounded-full",
                      agent.status === "active"
                        ? "bg-green-400"
                        : agent.status === "working"
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-gray-600"
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs text-gray-500">Sistema operativo</p>
        </div>
      </div>
    </aside>
  );
}
