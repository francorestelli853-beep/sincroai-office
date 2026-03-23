'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Agent, ActivityLog, AgentStatus } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── HELPERS ───────────────────────────────────────────────────────────────────

// Next.js serializa Date → string al cruzar Server→Client boundary.
// Aceptamos ambos tipos para no crashear con datos de Supabase.
function timeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

const statusBadgeVariant: Record<AgentStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  active: 'success',
  busy: 'warning',
  idle: 'secondary',
  offline: 'destructive',
}

const statusLabel: Record<AgentStatus, string> = {
  active: 'Activo',
  busy: 'Ocupado',
  idle: 'Inactivo',
  offline: 'Offline',
}

const categoryBadgeVariant = {
  task: 'success',
  communication: 'default',
  system: 'secondary',
  error: 'destructive',
} as const

// ─── FILTERS ───────────────────────────────────────────────────────────────────

type FilterOption = 'all' | AgentStatus

const filters: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'idle', label: 'Inactivo' },
  { value: 'offline', label: 'Offline' },
]

// ─── AGENT CARD ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  logs,
}: {
  agent: Agent
  logs: ActivityLog[]
}) {
  const recentLogs = logs
    .filter((l) => l.agentId === agent.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3)

  return (
    <Card className="flex flex-col transition-colors duration-200 hover:border-gray-700">
      <CardContent className="flex flex-1 flex-col gap-4 p-6">

        {/* Avatar + nombre + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-5xl leading-none">{agent.avatar}</span>
            <div>
              <p className="text-lg font-semibold text-white">{agent.name}</p>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <Badge variant={statusBadgeVariant[agent.status]}>
            {statusLabel[agent.status]}
          </Badge>
        </div>

        {/* Personalidad */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Personalidad
          </p>
          <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
            {agent.personality}
          </p>
        </div>

        {/* Herramientas */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Herramientas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </div>

        {/* Objetivo */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Objetivo
          </p>
          <p className="text-sm text-gray-300">{agent.objective}</p>
        </div>

        {/* Última actividad */}
        <p className="text-xs text-muted-foreground">
          Última actividad:{' '}
          <span className="text-gray-400">{timeAgo(agent.lastActive)}</span>
        </p>

        {/* Últimas 3 acciones */}
        {recentLogs.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acciones recientes
            </p>
            <ul className="space-y-2">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-2">
                  <Badge
                    variant={categoryBadgeVariant[log.category]}
                    className="mt-0.5 shrink-0 text-[10px]"
                  >
                    {log.category}
                  </Badge>
                  <p className="text-xs text-gray-400 line-clamp-1 flex-1">
                    {log.action}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(log.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botón */}
        <div className="mt-auto pt-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/agents/${agent.id}`}>Ver Detalle</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── AGENTS LIST ───────────────────────────────────────────────────────────────

export function AgentsList({
  agents,
  activityLog,
}: {
  agents: Agent[]
  activityLog: ActivityLog[]
}) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')

  const filtered =
    activeFilter === 'all'
      ? agents
      : agents.filter((a) => a.status === activeFilter)

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeFilter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            )}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {agents.filter((a) => a.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No hay agentes con ese estado.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} logs={activityLog} />
          ))}
        </div>
      )}
    </div>
  )
}
