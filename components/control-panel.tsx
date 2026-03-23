'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, CheckCircle, Clock, AlertCircle, X, ChevronRight } from 'lucide-react'
import { Agent, Task, Message, AgentStatus, TaskStatus, TaskPriority } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── HELPERS ───────────────────────────────────────────────────────────────────

// Next.js serializa Date → string al cruzar Server→Client boundary.
function timeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const taskStatusVariant: Record<TaskStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  completed: 'success',
  'in-progress': 'warning',
  pending: 'secondary',
  failed: 'destructive',
}

const taskStatusLabel: Record<TaskStatus, string> = {
  completed: 'Completada',
  'in-progress': 'En progreso',
  pending: 'Pendiente',
  failed: 'Fallida',
}

const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const priorityLabel: Record<TaskPriority, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }
const priorityVariant: Record<TaskPriority, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  critical: 'destructive', high: 'warning', medium: 'default', low: 'secondary',
}

const agentStatusLabel: Record<AgentStatus, string> = {
  active: 'Activo', busy: 'Ocupado', idle: 'Inactivo', offline: 'Offline',
}

// ─── TASK DIALOG ───────────────────────────────────────────────────────────────

function TaskDialog({
  task,
  agents,
  open,
  onClose,
}: {
  task: Task
  agents: Agent[]
  open: boolean
  onClose: () => void
}) {
  const assignedAgent = agents.find((a) => a.id === task.assignedTo)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-4">
            <div className="flex-1">
              <DialogTitle>{task.title}</DialogTitle>
              <DialogDescription className="mt-1">{task.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status + prioridad */}
          <div className="flex gap-2">
            <Badge variant={taskStatusVariant[task.status]}>{taskStatusLabel[task.status]}</Badge>
            <Badge variant={priorityVariant[task.priority]}>Prioridad {priorityLabel[task.priority]}</Badge>
          </div>

          {/* Agente asignado */}
          {assignedAgent && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-4 py-3">
              <span className="text-2xl">{assignedAgent.avatar}</span>
              <div>
                <p className="text-sm font-medium text-white">{assignedAgent.name}</p>
                <p className="text-xs text-muted-foreground">{assignedAgent.role}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-xs">
                {agentStatusLabel[assignedAgent.status]}
              </Badge>
            </div>
          )}

          {/* Subtareas */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Subtareas ({task.subtasks.length})
            </p>
            <ul className="space-y-2">
              {task.subtasks.map((sub, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded border border-gray-600" />
                  )}
                  <span className={cn(
                    'text-sm',
                    task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'
                  )}>
                    {sub}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Timeline
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Creada: {formatDateTime(task.createdAt)}
              </li>
              {task.completedAt && (
                <li className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Completada: {formatDateTime(task.completedAt)}
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          <Button disabled size="sm" title="Disponible en Fase 2">Reasignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── TASK CARD ─────────────────────────────────────────────────────────────────

function TaskCard({ task, agents, onClick }: { task: Task; agents: Agent[]; onClick: () => void }) {
  const agent = agents.find((a) => a.id === task.assignedTo)
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-gray-800/30 p-4 text-left transition-colors hover:border-gray-600 hover:bg-gray-800/60"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-200 leading-snug">{task.title}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant[task.priority]} className="text-[10px]">
          {priorityLabel[task.priority]}
        </Badge>
        {agent && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {agent.avatar} {agent.name}
          </span>
        )}
      </div>
      {task.status === 'in-progress' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
            <div className="h-full w-1/3 rounded-full bg-violet-500 animate-pulse" />
          </div>
        </div>
      )}
    </button>
  )
}

// ─── TASKS PANEL ───────────────────────────────────────────────────────────────

type TaskTab = 'in-progress' | 'pending' | 'completed'

function TasksPanel({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const [activeTab, setActiveTab] = useState<TaskTab>('in-progress')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const tabs: { value: TaskTab; label: string; icon: React.ReactNode }[] = [
    { value: 'in-progress', label: 'En Curso', icon: <AlertCircle className="h-3.5 w-3.5" /> },
    { value: 'pending', label: 'Pendientes', icon: <Clock className="h-3.5 w-3.5" /> },
    { value: 'completed', label: 'Completadas', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  ]

  const filtered = tasks
    .filter((t) => t.status === activeTab)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const count = tasks.filter((t) => t.status === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors',
                activeTab === tab.value
                  ? 'border-b-2 border-violet-500 text-violet-400'
                  : 'text-muted-foreground hover:text-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px]',
                activeTab === tab.value ? 'bg-violet-600/30 text-violet-300' : 'bg-gray-800 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* TODO: agregar skeleton mientras carga */}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin tareas pendientes
          </p>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              agents={agents}
              onClick={() => setSelectedTask(task)}
            />
          ))
        )}
      </div>

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          agents={agents}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

// ─── MESSAGES FEED ─────────────────────────────────────────────────────────────

function MessagesFeed({ messages, agents }: { messages: Message[]; agents: Agent[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [typingAgent, setTypingAgent] = useState<Agent | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const nameMap = Object.fromEntries(agents.map((a) => [a.id, a.name]))
  const avatarMap = Object.fromEntries(agents.map((a) => [a.id, a.avatar]))

  const filtered = messages
    .filter((m) =>
      filter === 'all' ? true : m.fromAgent === filter || m.toAgent === filter
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Fake typing indicator
  useEffect(() => {
    const activeAgents = agents.filter((a) => a.status === 'active' || a.status === 'busy')
    if (activeAgents.length === 0) return

    const cycle = () => {
      const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)]
      setTypingAgent(agent)
      setTimeout(() => setTypingAgent(null), 2200)
    }

    cycle()
    const interval = setInterval(cycle, 5000)
    return () => clearInterval(interval)
  }, [agents])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filtered.length])

  return (
    <div className="flex flex-col h-full">
      {/* Filter */}
      <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            filter === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          )}
        >
          Todos
        </button>
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => setFilter(a.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === a.id ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            )}
          >
            {a.avatar} {a.name}
          </button>
        ))}
      </div>

      {/* TODO: agregar skeleton mientras carga */}
      {/* Feed */}
      <div className="flex-1 scroll-smooth overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && !typingAgent && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Los agentes aún no han conversado
          </p>
        )}
        {filtered.map((msg) => (
          <div key={msg.id} className="rounded-lg bg-gray-800/40 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-gray-200">
                {avatarMap[msg.fromAgent] ?? '🤖'} {nameMap[msg.fromAgent] ?? msg.fromAgent}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-gray-200">
                {avatarMap[msg.toAgent] ?? '🤖'} {nameMap[msg.toAgent] ?? msg.toAgent}
              </span>
              <span className="ml-auto shrink-0 text-muted-foreground">{timeAgo(msg.timestamp)}</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-300 leading-relaxed">{msg.content}</p>
          </div>
        ))}

        {/* Typing indicator */}
        {typingAgent && (
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-sm">{typingAgent.avatar}</span>
            <span className="text-xs text-muted-foreground">{typingAgent.name} está escribiendo</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── CONTROL PANEL ─────────────────────────────────────────────────────────────

type MobileTab = 'tasks' | 'messages'

export function ControlPanel({
  agents,
  tasks,
  messages,
}: {
  agents: Agent[]
  tasks: Task[]
  messages: Message[]
}) {
  const [targetAgent, setTargetAgent] = useState<string>('all')
  const [commandText, setCommandText] = useState('')
  const [toast, setToast] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('tasks')

  const selectedAgent = agents.find((a) => a.id === targetAgent)
  const targetLabel = selectedAgent ? `${selectedAgent.avatar} ${selectedAgent.name}` : '🤖 Todos los agentes'

  const handleSend = () => {
    if (!commandText.trim()) return
    setToast(true)
    setTimeout(() => setToast(false), 4000)
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-600/10 px-4 py-3 text-sm text-violet-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Función disponible en Fase 2. El comando no fue enviado.</span>
          <button onClick={() => setToast(false)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Command input */}
      <Card className="border-violet-500/20 bg-gray-900/80">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nueva Orden
            </p>
          </div>

          {/* Destinatario */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label className="shrink-0 text-xs text-muted-foreground">Destinatario:</label>
            <Select value={targetAgent} onValueChange={setTargetAgent}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Seleccionar agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🤖 Todos los agentes</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.avatar} {a.name} — {a.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Textarea + botón */}
          <div className="relative">
            <textarea
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`Escribí una orden para ${targetLabel}...`}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pr-14 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
            <button
              onClick={handleSend}
              disabled={!commandText.trim()}
              className="absolute bottom-3 right-3 rounded-lg bg-violet-600 p-2 text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva línea</p>
        </CardContent>
      </Card>

      {/* Mobile tab switcher */}
      <div className="flex rounded-lg border border-border overflow-hidden lg:hidden">
        {(['tasks', 'messages'] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              mobileTab === tab ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-white'
            )}
          >
            {tab === 'tasks' ? 'Tareas' : 'Mensajes'}
          </button>
        ))}
      </div>

      {/* Two-column panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Tasks column */}
        <Card className={cn('flex flex-col min-h-[520px]', mobileTab !== 'tasks' && 'hidden lg:flex')}>
          <CardHeader className="pb-0">
            <CardTitle>Tareas</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <TasksPanel tasks={tasks} agents={agents} />
          </CardContent>
        </Card>

        {/* Messages column */}
        <Card className={cn('flex flex-col min-h-[520px]', mobileTab !== 'messages' && 'hidden lg:flex')}>
          <CardHeader className="pb-0">
            <CardTitle>Chat entre Agentes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <MessagesFeed messages={messages} agents={agents} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
