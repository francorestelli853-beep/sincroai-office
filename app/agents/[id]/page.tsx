import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAgent, getAgents, getTasks, getMessages, getActivityLog } from '@/lib/supabase'
import { AgentStatus, TaskStatus, TaskPriority } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
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

const taskStatusVariant: Record<TaskStatus, 'success' | 'warning' | 'secondary' | 'destructive' | 'default'> = {
  'completed': 'success',
  'in-progress': 'warning',
  'pending': 'secondary',
  'failed': 'destructive',
}

const taskStatusLabel: Record<TaskStatus, string> = {
  'completed': 'Completada',
  'in-progress': 'En progreso',
  'pending': 'Pendiente',
  'failed': 'Fallida',
}

const priorityOrder: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const priorityLabel: Record<TaskPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const priorityVariant: Record<TaskPriority, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'default',
  low: 'secondary',
}

const categoryBadgeVariant = {
  task: 'success',
  communication: 'default',
  system: 'secondary',
  error: 'destructive',
} as const

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [agent, allAgents, tasks, messages, activityLog] = await Promise.all([
    getAgent(params.id),
    getAgents(),
    getTasks(),
    getMessages(),
    getActivityLog(),
  ])

  if (!agent) notFound()

  // TODO: agregar skeleton mientras carga

  const agentTasks = tasks
    .filter((t) => t.assignedTo === agent.id)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const completedCount = agentTasks.filter((t) => t.status === 'completed').length
  const totalCount = agentTasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const agentMessages = messages
    .filter((m) => m.fromAgent === agent.id || m.toAgent === agent.id)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const agentLogs = activityLog
    .filter((l) => l.agentId === agent.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)

  // Map agent id → avatar for chat bubbles
  const avatarMap = Object.fromEntries(allAgents.map((a) => [a.id, a.avatar]))
  const nameMap = Object.fromEntries(allAgents.map((a) => [a.id, a.name]))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link href="/agents">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{agent.avatar}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
          </div>
        </div>
        <Badge variant={statusBadgeVariant[agent.status]} className="self-start sm:self-auto">
          {statusLabel[agent.status]}
        </Badge>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información del agente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Personalidad
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">{agent.personality}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Objetivo
                </p>
                <p className="text-sm text-gray-300">{agent.objective}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Herramientas
                </p>
                <div className="flex flex-wrap gap-2">
                  {agent.tools.map((tool) => (
                    <Badge key={tool} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Conversaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {agentMessages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Los agentes aún no han conversado
                </p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {agentMessages.map((msg) => {
                    const isSent = msg.fromAgent === agent.id
                    const otherAgentId = isSent ? msg.toAgent : msg.fromAgent
                    const otherAvatar = avatarMap[otherAgentId] ?? '🤖'
                    const otherName = nameMap[otherAgentId] ?? otherAgentId

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex gap-2', isSent ? 'flex-row-reverse' : 'flex-row')}
                      >
                        {/* Other agent avatar */}
                        {!isSent && (
                          <span className="mt-1 shrink-0 text-xl leading-none">{otherAvatar}</span>
                        )}

                        <div className={cn('flex max-w-[75%] flex-col gap-1', isSent && 'items-end')}>
                          <span className="text-[11px] text-muted-foreground">
                            {isSent ? `→ ${otherAvatar} ${otherName}` : `${otherAvatar} ${otherName}`}
                            {' · '}
                            {formatTime(msg.timestamp)}
                          </span>
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                              isSent
                                ? 'rounded-tr-sm bg-violet-600 text-white'
                                : 'rounded-tl-sm bg-gray-800 text-gray-200'
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>

                        {/* Own avatar for sent */}
                        {isSent && (
                          <span className="mt-1 shrink-0 text-xl leading-none">{agent.avatar}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Input deshabilitado */}
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Input
                  disabled
                  placeholder="Disponible en Fase 2"
                  className="flex-1"
                />
                <Button disabled size="sm">Enviar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Métricas */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tareas completadas</span>
                  <span className="font-medium text-white">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-violet-600 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">{progressPct}%</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-muted-foreground">Última actividad</p>
                  <p className="mt-1 text-sm font-medium text-white">{timeAgo(agent.lastActive)}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-muted-foreground">Herramientas</p>
                  <p className="mt-1 text-sm font-medium text-white">{agent.tools.length}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-muted-foreground">En progreso</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {agentTasks.filter((t) => t.status === 'in-progress').length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {agentTasks.filter((t) => t.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tareas asignadas */}
          <Card>
            <CardHeader>
              <CardTitle>Tareas Asignadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {agentTasks.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">Sin tareas asignadas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {agentTasks.map((task) => (
                    <li key={task.id} className="px-6 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-200 leading-snug flex-1">
                          {task.title}
                        </p>
                        <Badge variant={taskStatusVariant[task.status]} className="shrink-0 text-[10px]">
                          {taskStatusLabel[task.status]}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant={priorityVariant[task.priority]} className="text-[10px]">
                          {priorityLabel[task.priority]}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {task.subtasks.length} subtareas
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Activity log */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {agentLogs.length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">Sin actividad registrada</p>
              ) : (
                <ul className="divide-y divide-border">
                  {agentLogs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                      <div className="mt-1 flex flex-col items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={categoryBadgeVariant[log.category]}
                            className="text-[10px]"
                          >
                            {log.category}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {timeAgo(log.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-300">{log.action}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                          {log.details}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
