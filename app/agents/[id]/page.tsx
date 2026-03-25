export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Instagram, Star } from 'lucide-react'
import {
  getAgent,
  getAgents,
  getTasks,
  getMessagesBetween,
  getLeadsByAgent,
  getActivityByAgent,
} from '@/lib/supabase'
import { AgentStatus, TaskStatus, TaskPriority } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgentStatusSelector } from '@/components/agent-status-selector'
import { cn } from '@/lib/utils'

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string | null): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const statusBadgeVariant: Record<AgentStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  active: 'success', busy: 'warning', idle: 'secondary', offline: 'destructive',
}

const taskStatusVariant: Record<TaskStatus, 'success' | 'warning' | 'secondary' | 'destructive' | 'default'> = {
  completed: 'success', 'in-progress': 'warning', pending: 'secondary', failed: 'destructive',
}

const taskStatusLabel: Record<TaskStatus, string> = {
  completed: 'Completada', 'in-progress': 'En progreso', pending: 'Pendiente', failed: 'Fallida',
}

const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const priorityLabel: Record<TaskPriority, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }
const priorityVariant: Record<TaskPriority, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  critical: 'destructive', high: 'warning', medium: 'default', low: 'secondary',
}

const categoryBadgeVariant = {
  task: 'success', communication: 'default', system: 'secondary', error: 'destructive',
} as const

const STAGE_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', interested: 'Interesado',
  proposal_sent: 'Propuesta', closed: 'Cerrado', lost: 'Perdido',
}

const STAGE_VARIANTS: Record<string, 'secondary' | 'default' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  new: 'secondary', contacted: 'default', interested: 'warning',
  proposal_sent: 'outline', closed: 'success', lost: 'destructive',
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Fetch todos los datos en paralelo desde Supabase real
  const [agent, allAgents, tasks, agentLeads, agentLogs] = await Promise.all([
    getAgent(params.id),
    getAgents(),
    getTasks(),
    getLeadsByAgent(params.id),
    getActivityByAgent(params.id),
  ])

  if (!agent) notFound()

  // Mensajes donde este agente participó (como from o to) con cada otro agente
  const otherAgents = allAgents.filter((a) => a.id !== agent.id)
  const allMessageArrays = await Promise.all(
    otherAgents.map((other) => getMessagesBetween(agent.id, other.id))
  )
  const agentMessages = allMessageArrays
    .flat()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Tareas asignadas a este agente
  const agentTasks = tasks
    .filter((t) => t.assignedTo === agent.id)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // Métricas desde datos reales
  const completedCount = agentTasks.filter((t) => t.status === 'completed').length
  const totalCount = agentTasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const leadsCount = agentLeads.length
  const avgLeadScore = leadsCount > 0
    ? Math.round(agentLeads.filter((l) => l.leadScore !== null).reduce((s, l) => s + (l.leadScore ?? 0), 0) /
        Math.max(1, agentLeads.filter((l) => l.leadScore !== null).length))
    : null

  const lastActivityTs = agentLogs[0]?.timestamp ?? null

  // Avatar / name map para las conversaciones
  const avatarMap = Object.fromEntries(allAgents.map((a) => [a.id, a.avatar]))
  const nameMap   = Object.fromEntries(allAgents.map((a) => [a.id, a.name]))

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
        {/* Status selector — client component con PATCH real */}
        <AgentStatusSelector agentId={agent.id} currentStatus={agent.status} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Info */}
          <Card>
            <CardHeader><CardTitle>Información del agente</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Personalidad</p>
                <p className="text-sm text-gray-300 leading-relaxed">{agent.personality}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Objetivo</p>
                <p className="text-sm text-gray-300">{agent.objective}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Herramientas</p>
                <div className="flex flex-wrap gap-2">
                  {agent.tools.map((tool) => (
                    <Badge key={tool} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversaciones — datos reales de messages */}
          <Card>
            <CardHeader><CardTitle>Conversaciones</CardTitle></CardHeader>
            <CardContent>
              {agentMessages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Este agente aún no tiene conversaciones registradas
                </p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {agentMessages.map((msg) => {
                    const isSent = msg.fromAgent === agent.id
                    const otherAgentId = isSent ? msg.toAgent : msg.fromAgent
                    const otherAvatar = avatarMap[otherAgentId] ?? '🤖'
                    const otherName   = nameMap[otherAgentId] ?? otherAgentId

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex gap-2', isSent ? 'flex-row-reverse' : 'flex-row')}
                      >
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
                        {isSent && (
                          <span className="mt-1 shrink-0 text-xl leading-none">{agent.avatar}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Input disabled placeholder="Enviar mensajes disponible en Fase 3" className="flex-1" />
                <Button disabled size="sm">Enviar</Button>
              </div>
            </CardContent>
          </Card>

          {/* Leads encontrados — solo si tiene leads */}
          {leadsCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Leads Encontrados <span className="ml-1 text-sm font-normal text-muted-foreground">({leadsCount})</span></CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {agentLeads.map((lead) => {
                    const scoreColor = lead.leadScore !== null
                      ? lead.leadScore >= 80 ? 'bg-emerald-500'
                      : lead.leadScore >= 50 ? 'bg-yellow-500'
                      : 'bg-red-500'
                      : 'bg-gray-600'
                    const stageVariant = STAGE_VARIANTS[lead.stage] ?? 'secondary'

                    return (
                      <li key={lead.id} className="flex flex-col gap-2 px-6 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{lead.clinicName}</p>
                            {lead.location && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {lead.location}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <Badge variant={stageVariant} className="text-[10px]">
                              {STAGE_LABELS[lead.stage] ?? lead.stage}
                            </Badge>
                            {lead.leadScore !== null && (
                              <div className="flex items-center gap-1.5">
                                <Star className="h-3 w-3 text-yellow-400" />
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                                  <div
                                    className={cn('h-full rounded-full', scoreColor)}
                                    style={{ width: `${Math.min(100, lead.leadScore)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-gray-400">{lead.leadScore}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contact row */}
                        <div className="flex flex-wrap items-center gap-3">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </a>
                          )}
                          {lead.instagram && (
                            <a
                              href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-pink-400 hover:underline"
                            >
                              <Instagram className="h-3 w-3" /> {lead.instagram}
                            </a>
                          )}
                          <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(lead.createdAt)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <div className="px-6 py-3 border-t border-border">
                  <Link href="/leads" className="text-xs text-violet-400 hover:text-violet-300">
                    Ver todos los leads →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Métricas — calculadas desde datos reales */}
          <Card>
            <CardHeader><CardTitle>Métricas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Progreso de tareas */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tareas completadas</span>
                  <span className="font-medium text-white">{completedCount}/{totalCount}</span>
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
                  <p className="mt-1 text-sm font-medium text-white">{timeAgo(lastActivityTs)}</p>
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
                {leadsCount > 0 && (
                  <>
                    <div className="rounded-lg bg-gray-800/50 p-3">
                      <p className="text-xs text-muted-foreground">Leads encontrados</p>
                      <p className="mt-1 text-sm font-medium text-white">{leadsCount}</p>
                    </div>
                    {avgLeadScore !== null && (
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="text-xs text-muted-foreground">Score promedio</p>
                        <p className="mt-1 text-sm font-medium text-white">{avgLeadScore}/100</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tareas asignadas — desde Supabase */}
          <Card>
            <CardHeader><CardTitle>Tareas Asignadas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {agentTasks.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">Sin tareas asignadas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {agentTasks.map((task) => (
                    <li key={task.id} className="px-6 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-200 leading-snug flex-1">{task.title}</p>
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

          {/* Actividad reciente — desde activity_log filtrado por agente */}
          <Card>
            <CardHeader><CardTitle>Actividad Reciente</CardTitle></CardHeader>
            <CardContent className="p-0">
              {agentLogs.length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">Sin actividad registrada</p>
              ) : (
                <ul className="divide-y divide-border">
                  {agentLogs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={categoryBadgeVariant[log.category]} className="text-[10px]">
                            {log.category}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {timeAgo(log.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-300">{log.action}</p>
                        {log.details && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                            {log.details}
                          </p>
                        )}
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
