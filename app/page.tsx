export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Users, CheckCircle, MessageSquare, TrendingUp } from 'lucide-react'
import { getAgents, getTasks, getMessages, getActivityLog } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshButton } from '@/components/refresh-button'
import { AgentStatus } from '@/lib/types'

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
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

const categoryLabel = {
  task: 'tarea',
  communication: 'mensaje',
  system: 'sistema',
  error: 'error',
} as const

const agentAvatars: Record<string, string> = {
  luna: '🔍',
  marco: '🤝',
  vera: '⚡',
  atlas: '🛡️',
  nova: '📊',
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [agents, tasks, messages, activityLog] = await Promise.all([
    getAgents(),
    getTasks(),
    getMessages(),
    getActivityLog(),
  ])

  const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'busy').length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const messagesToday = messages.filter((m) => isToday(m.timestamp)).length
  const successRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  const recentActivity = [...activityLog]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Oficina Virtual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistema de agentes autónomos de SincroAI
          </p>
        </div>
        <Badge variant="outline">Fase 2 — Supabase</Badge>
      </div>

      {/* KPI Cards — clickeables */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/agents" className="block">
          <Card className="transition-colors hover:border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Agentes Activos
                </p>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{activeAgents}</p>
              <p className="mt-1 text-xs text-muted-foreground">de {agents.length} total</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/control" className="block">
          <Card className="transition-colors hover:border-violet-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tareas Completadas
                </p>
                <CheckCircle className="h-4 w-4 text-violet-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{completedTasks}</p>
              <p className="mt-1 text-xs text-muted-foreground">de {tasks.length} tareas</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/control" className="block">
          <Card className="transition-colors hover:border-blue-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mensajes Hoy
                </p>
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{messagesToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">entre agentes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/activity" className="block">
          <Card className="transition-colors hover:border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tasa de Éxito
                </p>
                <TrendingUp className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{successRate}%</p>
              <p className="mt-1 text-xs text-muted-foreground">tareas completadas</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Agents Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Agentes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="transition-colors hover:border-gray-700"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl leading-none">{agent.avatar}</span>
                  <Badge variant={statusBadgeVariant[agent.status]}>
                    {statusLabel[agent.status]}
                  </Badge>
                </div>

                <div className="mt-3">
                  <p className="font-semibold text-white">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.role}</p>
                </div>

                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {agent.objective}
                </p>

                <Link
                  href={`/agents/${agent.id}`}
                  className="mt-4 flex items-center text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
                >
                  Ver detalle →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Actividad Reciente</h2>
          <div className="flex items-center gap-2">
            <RefreshButton label="Refrescar" />
            <Link href="/activity" className="text-xs text-violet-400 transition-colors hover:text-violet-300">
              Ver todo →
            </Link>
          </div>
        </div>

        {/* TODO: agregar skeleton mientras carga */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentActivity.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sin actividad registrada
                </p>
              ) : recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 p-4">
                  {/* Timeline dot */}
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    <span className="text-base leading-none">
                      {agentAvatars[entry.agentId] ?? '🤖'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {entry.agentName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.action}
                      </span>
                      <Badge
                        variant={categoryBadgeVariant[entry.category]}
                        className="ml-auto"
                      >
                        {categoryLabel[entry.category]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {entry.details}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
