'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { Agent, ActivityLog, AgentStatus } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// ─── ADD AGENT DIALOG ──────────────────────────────────────────────────────────

type AgentFormData = {
  avatar: string
  name: string
  role: string
  personality: string
  objective: string
  tools: string       // comma-separated
  status: AgentStatus
}

const EMPTY_FORM: AgentFormData = {
  avatar: '🤖',
  name: '',
  role: '',
  personality: '',
  objective: '',
  tools: '',
  status: 'idle',
}

function AddAgentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (agent: Agent) => void
}) {
  const [form, setForm] = useState<AgentFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof AgentFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.objective.trim()) {
      setError('Nombre, rol y objetivo son requeridos')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const tools = form.tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          role: form.role.trim(),
          personality: form.personality.trim(),
          objective: form.objective.trim(),
          tools,
          avatar: form.avatar.trim() || '🤖',
          status: form.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el agente')
        return
      }
      // Mapear la respuesta al tipo Agent
      const raw = data.agent
      const newAgent: Agent = {
        id: raw.id,
        name: raw.name,
        role: raw.role,
        personality: raw.personality ?? '',
        status: raw.status as AgentStatus,
        tools: Array.isArray(raw.tools) ? raw.tools : [],
        objective: raw.objective,
        avatar: raw.avatar,
        lastActive: new Date(raw.last_active ?? raw.created_at),
      }
      onCreated(newAgent)
      setForm(EMPTY_FORM)
      onClose()
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Agente</DialogTitle>
          <DialogDescription>
            Creá un nuevo agente y se guardará en Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar + Nombre */}
          <div className="flex gap-3">
            <div className="w-20">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Emoji</label>
              <Input
                value={form.avatar}
                onChange={(e) => set('avatar', e.target.value)}
                placeholder="🤖"
                className="text-center text-xl"
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Aria"
              />
            </div>
          </div>

          {/* Rol + Status */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Rol *</label>
              <Input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Ej: Analyst"
              />
            </div>
            <div className="w-36">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">🟢 Activo</SelectItem>
                  <SelectItem value="busy">🟡 Ocupado</SelectItem>
                  <SelectItem value="idle">⚪ Inactivo</SelectItem>
                  <SelectItem value="offline">🔴 Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Personalidad */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Personalidad</label>
            <textarea
              value={form.personality}
              onChange={(e) => set('personality', e.target.value)}
              placeholder="Descripción del estilo y forma de trabajar del agente…"
              rows={2}
              className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          {/* Objetivo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Objetivo *</label>
            <Input
              value={form.objective}
              onChange={(e) => set('objective', e.target.value)}
              placeholder="¿Qué hace este agente?"
            />
          </div>

          {/* Tools */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Herramientas <span className="text-gray-500">(separadas por coma)</span>
            </label>
            <Input
              value={form.tools}
              onChange={(e) => set('tools', e.target.value)}
              placeholder="Ej: Email Sender, CRM Writer, Calendar"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <X className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Crear Agente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents)
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const filtered =
    activeFilter === 'all'
      ? localAgents
      : localAgents.filter((a) => a.status === activeFilter)

  const handleAgentCreated = (newAgent: Agent) => {
    setLocalAgents((prev) => [...prev, newAgent])
    setSuccessMsg(`✅ Agente "${newAgent.name}" creado correctamente`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  return (
    <div className="space-y-6">

      {/* Filtros + botón */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                  {localAgents.filter((a) => a.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Agregar Agente
        </Button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

      <AddAgentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onCreated={handleAgentCreated}
      />
    </div>
  )
}
