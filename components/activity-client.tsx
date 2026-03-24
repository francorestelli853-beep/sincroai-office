'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ActivityLog, Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

type Category = ActivityLog['category']
type DateFilter = 'today' | '7days' | 'all'

const CATEGORY_DOT: Record<Category, string> = {
  task:          'bg-violet-500',
  communication: 'bg-blue-500',
  system:        'bg-gray-500',
  error:         'bg-red-500',
}

const CATEGORY_BADGE: Record<Category, 'default' | 'success' | 'secondary' | 'destructive'> = {
  task:          'default',
  communication: 'secondary',
  system:        'secondary',
  error:         'destructive',
}

const CATEGORY_LABEL: Record<Category, string> = {
  task:          'tarea',
  communication: 'mensaje',
  system:        'sistema',
  error:         'error',
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isToday(date: Date): boolean {
  return dayKey(date) === dayKey(new Date())
}

function isWithin7Days(date: Date): boolean {
  return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000
}

function groupByDay(entries: ActivityLog[]): { day: string; date: Date; items: ActivityLog[] }[] {
  const map = new Map<string, { date: Date; items: ActivityLog[] }>()
  for (const entry of entries) {
    const key = dayKey(entry.timestamp)
    if (!map.has(key)) map.set(key, { date: entry.timestamp, items: [] })
    map.get(key)!.items.push(entry)
  }
  return Array.from(map.entries()).map(([day, { date, items }]) => ({ day, date, items }))
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

interface ActivityClientProps {
  logs: ActivityLog[]
  agents: Pick<Agent, 'id' | 'avatar' | 'name'>[]
}

export function ActivityClient({ logs, agents }: ActivityClientProps) {
  const [search, setSearch]                 = useState('')
  const [agentFilter, setAgentFilter]       = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [dateFilter, setDateFilter]         = useState<DateFilter>('all')

  // Mapa de avatares construido desde datos reales de Supabase
  const avatarMap = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a.avatar])),
    [agents]
  )

  const filtered = useMemo(() => {
    return logs
      .filter((e) => {
        if (agentFilter !== 'all' && e.agentId !== agentFilter) return false
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
        if (dateFilter === 'today' && !isToday(e.timestamp)) return false
        if (dateFilter === '7days' && !isWithin7Days(e.timestamp)) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          if (
            !e.action.toLowerCase().includes(q) &&
            !e.details.toLowerCase().includes(q) &&
            !e.agentName.toLowerCase().includes(q)
          ) return false
        }
        return true
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [logs, search, agentFilter, categoryFilter, dateFilter])

  const groups = groupByDay(filtered)

  const categories: { value: Category | 'all'; label: string }[] = [
    { value: 'all',           label: 'Todas' },
    { value: 'task',          label: 'Tareas' },
    { value: 'communication', label: 'Mensajes' },
    { value: 'system',        label: 'Sistema' },
    { value: 'error',         label: 'Errores' },
  ]

  const dateOptions: { value: DateFilter; label: string }[] = [
    { value: 'today',  label: 'Hoy' },
    { value: '7days',  label: 'Últimos 7 días' },
    { value: 'all',    label: 'Todo' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Log de Actividad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial completo de eventos del sistema
          </p>
        </div>
        <div className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-300">
            {filtered.length}{' '}
            <span className="text-muted-foreground">
              {filtered.length === logs.length
                ? 'eventos totales'
                : `de ${logs.length} eventos`}
            </span>
          </span>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">

        {/* Row 1: search + agent select */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción, detalle o agente..."
              className="pl-9"
            />
          </div>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Todos los agentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los agentes</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.avatar} {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: category + date toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  categoryFilter === c.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-1.5">
            {dateOptions.map((d) => (
              <button
                key={d.value}
                onClick={() => setDateFilter(d.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  dateFilter === d.value
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <p className="text-2xl">🔍</p>
          <p className="mt-3 text-sm font-medium text-gray-300">No se encontraron eventos</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {logs.length === 0
              ? 'Sin actividad registrada en Supabase'
              : 'No se encontraron eventos con estos filtros'}
          </p>
          {logs.length > 0 && (
            <button
              onClick={() => {
                setSearch('')
                setAgentFilter('all')
                setCategoryFilter('all')
                setDateFilter('all')
              }}
              className="mt-4 text-xs text-violet-400 hover:text-violet-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ day, date, items }) => (
            <div key={day}>
              {/* Day separator */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="shrink-0 rounded-full border border-border bg-gray-800 px-3 py-1 text-xs font-medium capitalize text-gray-400">
                  {isToday(date) ? 'Hoy' : formatDate(date)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Events for this day */}
              <div className="relative ml-2 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 h-full w-px bg-border" />

                {items.map((entry) => (
                  <div key={entry.id} className="relative flex gap-5 pb-6 last:pb-0">
                    {/* Dot */}
                    <div className="relative z-10 mt-1 flex-shrink-0">
                      <div className={cn(
                        'h-4 w-4 rounded-full border-2 border-gray-950',
                        CATEGORY_DOT[entry.category]
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 rounded-lg border border-border bg-gray-900/60 p-4 transition-colors hover:bg-gray-900">
                      <div className="flex flex-wrap items-start gap-2">
                        {/* Agent + action */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base leading-none shrink-0">
                            {avatarMap[entry.agentId] ?? '🤖'}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm text-muted-foreground">
                              {entry.agentName}
                            </span>
                            {' '}
                            <span className="text-sm font-semibold text-white">
                              {entry.action}
                            </span>
                          </div>
                        </div>

                        {/* Right side: badge + time */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={CATEGORY_BADGE[entry.category]} className="text-[10px]">
                            {CATEGORY_LABEL[entry.category]}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Detail */}
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {entry.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
