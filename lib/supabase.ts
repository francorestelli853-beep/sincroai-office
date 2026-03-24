import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { Agent, Task, TaskStatus, Message, ActivityLog } from './types'

// ─── CLIENT (lazy singleton) ────────────────────────────────────────────────────
// createClient se ejecuta solo en el primer acceso, nunca al importar el módulo.
// Esto evita el error "supabaseUrl is required" durante el build de Next.js.

let _client: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase env vars not configured')
    }
    _client = createClient(url, key)
  }
  return _client
}

// Proxy lazy: el cliente real solo se crea cuando se llama un método (.from, .auth, etc.)
const lazyClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const supabase = lazyClient
// supabaseAdmin es un alias — en Fase 2 se puede reemplazar por el service_role key
export const supabaseAdmin = lazyClient
export default lazyClient

// ─── MAPPERS (snake_case DB → camelCase TypeScript) ────────────────────────────

type DbRow = Record<string, unknown>

function mapAgent(row: DbRow): Agent {
  return {
    id:          row.id as string,
    name:        row.name as string,
    role:        row.role as string,
    personality: row.personality as string,
    status:      row.status as Agent['status'],
    tools:       Array.isArray(row.tools) ? (row.tools as string[]) : [],
    objective:   row.objective as string,
    avatar:      row.avatar as string,
    lastActive:  new Date((row.last_active ?? row.created_at) as string),
  }
}

function mapTask(row: DbRow): Task {
  return {
    id:          row.id as string,
    title:       row.title as string,
    description: row.description as string,
    assignedTo:  row.assigned_to as string,
    status:      row.status as Task['status'],
    priority:    row.priority as Task['priority'],
    subtasks:    Array.isArray(row.subtasks) ? (row.subtasks as string[]) : [],
    createdAt:   new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  }
}

function mapMessage(row: DbRow): Message {
  return {
    id:        row.id as string,
    fromAgent: row.from_agent as string,
    toAgent:   row.to_agent as string,
    content:   row.content as string,
    type:      row.type as Message['type'],
    timestamp: new Date(row.timestamp as string),
  }
}

function mapActivityLog(row: DbRow): ActivityLog {
  return {
    id:        row.id as string,
    agentId:   row.agent_id as string,
    agentName: row.agent_name as string,
    action:    row.action as string,
    details:   row.details as string,
    category:  row.category as ActivityLog['category'],
    timestamp: new Date((row.timestamp ?? row.created_at) as string),
  }
}

// ─── SAFE MAPPER ───────────────────────────────────────────────────────────────
// Mapea rows individualmente — un row mal formado no cancela los demás.

function safeMap<T>(rows: DbRow[], mapper: (r: DbRow) => T, label: string): T[] {
  const results: T[] = []
  for (const row of rows) {
    try {
      results.push(mapper(row))
    } catch (err) {
      console.error(`[Supabase:${label}] mapeo fallido en row id=${row.id}:`, err)
    }
  }
  return results
}

// ─── AGENTS ────────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .order('name', { ascending: true })

  // Log de diagnóstico — visible en Vercel Function Logs
  console.log('[Supabase:getAgents]', {
    error:    error ? { code: error.code, message: error.message } : null,
    rowCount: data?.length ?? 0,
    statuses: data?.map((r) => `${r.id}:${r.status}`) ?? [],
  })

  if (error) {
    console.error('[Supabase:getAgents] query error:', error.message)
    return []
  }

  if (!data || data.length === 0) {
    console.warn('[Supabase:getAgents] sin datos — ¿RLS bloqueando?')
    return []
  }

  const agents = safeMap(data as DbRow[], mapAgent, 'getAgents')
  console.log('[Supabase:getAgents] ✓', agents.map((a) => `${a.name}:${a.status}`))
  return agents
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  console.log('[Supabase:getAgent]', {
    id,
    error:  error ? { code: error.code, message: error.message } : null,
    status: (data as DbRow | null)?.status ?? null,
  })

  if (error || !data) {
    console.warn('[Supabase:getAgent] sin datos para id:', id)
    return undefined
  }

  try {
    return mapAgent(data as DbRow)
  } catch (err) {
    console.error('[Supabase:getAgent] mapAgent falló:', err)
    return undefined
  }
}

// ─── TASKS ─────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Supabase:getTasks] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return safeMap(data as DbRow[], mapTask, 'getTasks')
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Supabase:getTasksByStatus] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return safeMap(data as DbRow[], mapTask, 'getTasksByStatus')
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .insert({
      title:        task.title,
      description:  task.description,
      assigned_to:  task.assignedTo,
      status:       task.status,
      priority:     task.priority,
      subtasks:     task.subtasks,
      created_at:   task.createdAt.toISOString(),
      completed_at: task.completedAt?.toISOString() ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[Supabase:createTask] error:', error?.message)
    return { ...task, id: `task-${Date.now()}` }
  }

  return mapTask(data as DbRow)
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await getSupabase()
    .from('tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) {
    console.error('[Supabase:updateTaskStatus] error:', error.message)
  }
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from('messages')
    .select('*')
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('[Supabase:getMessages] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return safeMap(data as DbRow[], mapMessage, 'getMessages')
}

export async function getMessagesBetween(agentA: string, agentB: string): Promise<Message[]> {
  const { data, error } = await getSupabase()
    .from('messages')
    .select('*')
    .or(
      `and(from_agent.eq.${agentA},to_agent.eq.${agentB}),and(from_agent.eq.${agentB},to_agent.eq.${agentA})`
    )
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('[Supabase:getMessagesBetween] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return safeMap(data as DbRow[], mapMessage, 'getMessagesBetween')
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────

export async function getActivityLog(): Promise<ActivityLog[]> {
  const { data, error } = await getSupabase()
    .from('activity_log')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('[Supabase:getActivityLog] error:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return safeMap(data as DbRow[], mapActivityLog, 'getActivityLog')
}
