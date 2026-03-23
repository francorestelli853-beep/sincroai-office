'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Terminal,
  Activity,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/control', label: 'Control', icon: Terminal },
  { href: '/activity', label: 'Actividad', icon: Activity },
]

const quickAgents = [
  { id: 'luna', emoji: '🔍', name: 'Luna', status: 'active' },
  { id: 'marco', emoji: '🤝', name: 'Marco', status: 'active' },
  { id: 'vera', emoji: '⚡', name: 'Vera', status: 'idle' },
  { id: 'atlas', emoji: '🛡️', name: 'Atlas', status: 'active' },
  { id: 'nova', emoji: '📊', name: 'Nova', status: 'busy' },
]

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">SincroAI</p>
            <p className="text-xs text-muted-foreground">Virtual Office</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navegación
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-muted-foreground hover:bg-gray-800/60 hover:text-gray-200'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-violet-400' : 'text-gray-500')} />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Quick agent access */}
        <div className="mt-6">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agentes
          </p>
          <ul className="space-y-0.5">
            {quickAgents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                    pathname === `/agents/${agent.id}`
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-muted-foreground hover:bg-gray-800/40 hover:text-gray-300'
                  )}
                >
                  <span className="text-base leading-none">{agent.emoji}</span>
                  <span className="truncate">{agent.name}</span>
                  <span
                    className={cn(
                      'ml-auto h-2 w-2 shrink-0 rounded-full transition-colors',
                      agent.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : agent.status === 'busy'
                        ? 'bg-yellow-400 animate-pulse'
                        : 'bg-gray-600'
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs text-muted-foreground">Sistema operativo</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 border-r border-border bg-gray-950 md:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-gray-950 px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-bold text-white">SincroAI</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ── Mobile drawer overlay ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            className="absolute left-0 top-0 h-full w-72 bg-gray-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
