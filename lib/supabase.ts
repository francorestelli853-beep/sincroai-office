import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { Agent, Task, TaskStatus, Message, ActivityLog } from './types'
import {
  mockAgents,
  mockTasks,
  mockMessages,
  mockActivityLog,
  getAgentById,
} from './mock-data'

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
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    personality: row.personality as string,
    status: row.status as Agent['status'],
    tools: Array.isArray(row.tools) ? (row.tools as string[]) : [],
    objective: row.objective as string,
    avatar: row.avatar as string,
    lastActive: new Date((row.last_active ?? row.created_at) as string),
  }
}

function mapTask(row: DbRow): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    assignedTo: row.assigned_to as string,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    subtasks: Array.isArray(row.subtasks) ? (row.subtasks as string[]) : [],
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  }
}

function mapMessage(row: DbRow): Message {
  return {
    id: row.id as string,
    fromAgent: row.from_agent as string,
    toAgent: row.to_agent as string,
    content: row.content as string,
    type: row.type as Message['type'],
    timestamp: new Date(row.timestamp as string),
  }
}

function mapActivityLog(row: DbRow): ActivityLog {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    agentName: row.agent_name as string,
    action: row.action as string,
    details: row.details as string,
    category: row.category as ActivityLog['category'],
    timestamp: new Date(row.timestamp as string),
  }
}

// ─── AGENTS ────────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await getSupabase()
      .from('agents')
      .select('*')
      .order('name', { ascending: true })

    console.log('[Supabase] getAgents →', {
      error: error?.message ?? null,
      rowCount: data?.length ?? 0,
      sample: data?.[0] ?? null,
    })

    if (error) {
      console.warn('[Supabase] getAgents error, usando mock:', error.message)
      return mockAgents
    }

    if (!data || data.length === 0) {
      console.info('[Supabase] agents vacío, usando mock')
      return mockAgents
    }

    const mapped = data.map(mapAgent)
    console.log('[Supabase] getAgents mapped[0]:', mapped[0])
    return mapped
  } catch (err) {
    console.warn('[Supabase] getAgents exception, usando mock:', err)
    return mockAgents
  }
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  try {
    const { data, error } = await getSupabase()
      .from('agents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.warn('[Supabase] getAgent error, usando mock:', error.message)
      return getAgentById(id)
    }

    return data ? mapAgent(data) : getAgentById(id)
  } catch (err) {
    console.warn('[Supabase] getAgent exception, usando mock:', err)
    return getAgentById(id)
  }
}

// ─── TASKS ─────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  try {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[Supabase] getTasks error, usando mock:', error.message)
      return mockTasks
    }

    if (!data || data.length === 0) {
      console.info('[Supabase] tasks vacío, usando mock')
      return mockTasks
    }

    return data.map(mapTask)
  } catch (err) {
    console.warn('[Supabase] getTasks exception, usando mock:', err)
    return mockTasks
  }
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  try {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[Supabase] getTasksByStatus error, usando mock:', error.message)
      return mockTasks.filter((t) => t.status === status)
    }

    if (!data || data.length === 0) {
      return mockTasks.filter((t) => t.status === status)
    }

    return data.map(mapTask)
  } catch (err) {
    console.warn('[Supabase] getTasksByStatus exception, usando mock:', err)
    return mockTasks.filter((t) => t.status === status)
  }
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  try {
    const { data, error } = await getSupabase()
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        assigned_to: task.assignedTo,
        status: task.status,
        priority: task.priority,
        subtasks: task.subtasks,
        created_at: task.createdAt.toISOString(),
        completed_at: task.completedAt?.toISOString() ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Supabase] createTask error:', error.message)
      return { ...task, id: `task-${Date.now()}` }
    }

    return mapTask(data)
  } catch (err) {
    console.error('[Supabase] createTask exception:', err)
    return { ...task, id: `task-${Date.now()}` }
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from('tasks')
      .update({
        status,
        completed_at:
          status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', taskId)

    if (error) {
      console.error('[Supabase] updateTaskStatus error:', error.message)
    }
  } catch (err) {
    console.error('[Supabase] updateTaskStatus exception:', err)
  }
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(): Promise<Message[]> {
  try {
    const { data, error } = await getSupabase()
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true })

    if (error) {
      console.warn('[Supabase] getMessages error, usando mock:', error.message)
      return mockMessages
    }

    if (!data || data.length === 0) {
      console.info('[Supabase] messages vacío, usando mock')
      return mockMessages
    }

    return data.map(mapMessage)
  } catch (err) {
    console.warn('[Supabase] getMessages exception, usando mock:', err)
    return mockMessages
  }
}

export async function getMessagesBetween(
  agentA: string,
  agentB: string
): Promise<Message[]> {
  try {
    const { data, error } = await getSupabase()
      .from('messages')
      .select('*')
      .or(
        `and(from_agent.eq.${agentA},to_agent.eq.${agentB}),and(from_agent.eq.${agentB},to_agent.eq.${agentA})`
      )
      .order('timestamp', { ascending: true })

    if (error) {
      console.warn('[Supabase] getMessagesBetween error, usando mock:', error.message)
      return mockMessages.filter(
        (m) =>
          (m.fromAgent === agentA && m.toAgent === agentB) ||
          (m.fromAgent === agentB && m.toAgent === agentA)
      )
    }

    if (!data || data.length === 0) {
      return mockMessages.filter(
        (m) =>
          (m.fromAgent === agentA && m.toAgent === agentB) ||
          (m.fromAgent === agentB && m.toAgent === agentA)
      )
    }

    return data.map(mapMessage)
  } catch (err) {
    console.warn('[Supabase] getMessagesBetween exception, usando mock:', err)
    return mockMessages.filter(
      (m) =>
        (m.fromAgent === agentA && m.toAgent === agentB) ||
        (m.fromAgent === agentB && m.toAgent === agentA)
    )
  }
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────

export async function getActivityLog(): Promise<ActivityLog[]> {
  try {
    const { data, error } = await getSupabase()
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })

    if (error) {
      console.warn('[Supabase] getActivityLog error, usando mock:', error.message)
      return mockActivityLog
    }

    if (!data || data.length === 0) {
      console.info('[Supabase] activity_log vacío, usando mock')
      return mockActivityLog
    }

    return data.map(mapActivityLog)
  } catch (err) {
    console.warn('[Supabase] getActivityLog exception, usando mock:', err)
    return mockActivityLog
  }
}
