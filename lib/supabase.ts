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
// supabaseAdmin es un alias — en Fase 2 se reemplaza por el service_role key
export const supabaseAdmin = lazyClient
export default lazyClient

// ─── AGENTS ────────────────────────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockAgents
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return getAgentById(id)
}

// ─── TASKS ─────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockTasks
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockTasks.filter((task) => task.status === status)
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  // TODO Fase 2: reemplazar por query real a Supabase
  const newTask: Task = { ...task, id: `task-${Date.now()}` }
  console.log('[Supabase mock] createTask:', newTask)
  return newTask
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<void> {
  // TODO Fase 2: reemplazar por query real a Supabase
  console.log('[Supabase mock] updateTaskStatus:', { taskId, status })
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(): Promise<Message[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockMessages
}

export async function getMessagesBetween(
  agentA: string,
  agentB: string
): Promise<Message[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockMessages.filter(
    (msg) =>
      (msg.fromAgent === agentA && msg.toAgent === agentB) ||
      (msg.fromAgent === agentB && msg.toAgent === agentA)
  )
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────

export async function getActivityLog(): Promise<ActivityLog[]> {
  // TODO Fase 2: reemplazar por query real a Supabase
  return mockActivityLog
}
