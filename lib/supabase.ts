import { SupabaseClient, createClient as createSupabaseClient } from '@supabase/supabase-js'
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
    // IMPORTANTE: fetch con cache:'no-store' evita que Next.js 14 cachee las
    // respuestas del SDK de Supabase. Sin esto, cambios en la DB no se reflejan
    // en la app hasta que el servidor se reinicia (cache hit permanente).
    _client = createSupabaseClient(url, key, {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    })
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
  try {
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
  } catch (err) {
    // Incluye "Supabase env vars not configured" en build time sin env vars
    console.warn('[Supabase:getAgents] no disponible:', (err as Error).message)
    return []
  }
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  try {
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
    return mapAgent(data as DbRow)
  } catch (err) {
    console.warn('[Supabase:getAgent] no disponible:', (err as Error).message)
    return undefined
  }
}

// ─── TASKS ─────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  try {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error('[Supabase:getTasks] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapTask, 'getTasks')
  } catch (err) {
    console.warn('[Supabase:getTasks] no disponible:', (err as Error).message)
    return []
  }
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  try {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) { console.error('[Supabase:getTasksByStatus] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapTask, 'getTasksByStatus')
  } catch (err) {
    console.warn('[Supabase:getTasksByStatus] no disponible:', (err as Error).message)
    return []
  }
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  try {
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
  } catch (err) {
    console.warn('[Supabase:createTask] no disponible:', (err as Error).message)
    return { ...task, id: `task-${Date.now()}` }
  }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from('tasks')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', taskId)

    if (error) console.error('[Supabase:updateTaskStatus] error:', error.message)
  } catch (err) {
    console.warn('[Supabase:updateTaskStatus] no disponible:', (err as Error).message)
  }
}

// ─── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(): Promise<Message[]> {
  try {
    const { data, error } = await getSupabase()
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true })

    if (error) { console.error('[Supabase:getMessages] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapMessage, 'getMessages')
  } catch (err) {
    console.warn('[Supabase:getMessages] no disponible:', (err as Error).message)
    return []
  }
}

export async function getMessagesBetween(agentA: string, agentB: string): Promise<Message[]> {
  try {
    const { data, error } = await getSupabase()
      .from('messages')
      .select('*')
      .or(
        `and(from_agent.eq.${agentA},to_agent.eq.${agentB}),and(from_agent.eq.${agentB},to_agent.eq.${agentA})`
      )
      .order('timestamp', { ascending: true })

    if (error) { console.error('[Supabase:getMessagesBetween] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapMessage, 'getMessagesBetween')
  } catch (err) {
    console.warn('[Supabase:getMessagesBetween] no disponible:', (err as Error).message)
    return []
  }
}

// ─── LEADS ─────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  leadNumber: number | null
  clinicName: string
  location: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  stage: string
  assignedAgent: string | null
  instagram: string | null
  address: string | null
  leadScore: number | null
  foundBy: string | null
  source: string | null
  notes: string | null
  lastContact: Date | null
  createdAt: Date
}

function mapLead(row: DbRow): Lead {
  return {
    id:            row.id as string,
    leadNumber:    row.lead_number != null ? Number(row.lead_number) : null,
    clinicName:    (row.clinic_name ?? '') as string,
    location:      (row.location ?? null) as string | null,
    contactName:   (row.contact_name ?? null) as string | null,
    email:         (row.email ?? null) as string | null,
    phone:         (row.phone ?? null) as string | null,
    stage:         (row.stage ?? 'new') as string,
    assignedAgent: (row.assigned_agent ?? null) as string | null,
    instagram:     (row.instagram ?? null) as string | null,
    address:       (row.address ?? null) as string | null,
    leadScore:     (row.lead_score ?? null) as number | null,
    foundBy:       (row.found_by ?? null) as string | null,
    source:        (row.source ?? null) as string | null,
    notes:         (row.notes ?? null) as string | null,
    lastContact:   row.last_contact ? new Date(row.last_contact as string) : null,
    createdAt:     new Date((row.created_at ?? new Date().toISOString()) as string),
  }
}

export async function getLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .order('lead_number', { ascending: false, nullsFirst: false })

    console.log('[Supabase:getLeads]', {
      error:       error ? { code: error.code, message: error.message } : null,
      rowCount:    data?.length ?? 0,
      leadNumbers: data?.map((r) => `${r.id}:${r.lead_number}`) ?? [],
    })

    if (error) { console.error('[Supabase:getLeads] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapLead, 'getLeads')
  } catch (err) {
    console.warn('[Supabase:getLeads] no disponible:', (err as Error).message)
    return []
  }
}

export async function getLeadsByAgent(agentId: string): Promise<Lead[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .eq('found_by', agentId)
      .order('lead_number', { ascending: false, nullsFirst: false })

    if (error) { console.error('[Supabase:getLeadsByAgent] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapLead, 'getLeadsByAgent')
  } catch (err) {
    console.warn('[Supabase:getLeadsByAgent] no disponible:', (err as Error).message)
    return []
  }
}

// ─── CLIENTS ────────────────────────────────────────────────────────────────────

export interface OnboardingItem {
  step: number
  name: string
  done: boolean
}

export interface Client {
  id: string
  clinicName: string
  ownerName: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  address: string | null
  status: 'onboarding' | 'active' | 'paused' | 'cancelled'
  onboardingStep: number
  onboardingChecklist: OnboardingItem[]
  notes: string | null
  createdAt: Date
}

function mapClient(row: DbRow): Client {
  let checklist: OnboardingItem[] = []
  try {
    const raw = row.onboarding_checklist
    if (Array.isArray(raw)) checklist = raw as OnboardingItem[]
    else if (typeof raw === 'string') checklist = JSON.parse(raw) as OnboardingItem[]
  } catch { checklist = [] }

  return {
    id:                  row.id as string,
    clinicName:          (row.clinic_name ?? '') as string,
    ownerName:           (row.owner_name ?? null) as string | null,
    email:               (row.email ?? null) as string | null,
    phone:               (row.phone ?? null) as string | null,
    instagram:           (row.instagram ?? null) as string | null,
    address:             (row.address ?? null) as string | null,
    status:              (row.status ?? 'onboarding') as Client['status'],
    onboardingStep:      row.onboarding_step != null ? Number(row.onboarding_step) : 1,
    onboardingChecklist: checklist,
    notes:               (row.notes ?? null) as string | null,
    createdAt:           new Date((row.created_at ?? new Date().toISOString()) as string),
  }
}

export async function getClients(): Promise<Client[]> {
  try {
    const { data, error } = await getSupabase()
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error('[Supabase:getClients] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapClient, 'getClients')
  } catch (err) {
    console.warn('[Supabase:getClients] no disponible:', (err as Error).message)
    return []
  }
}

export async function getClient(id: string): Promise<Client | null> {
  try {
    const { data, error } = await getSupabase()
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) { console.error('[Supabase:getClient] error:', error.message); return null }
    if (!data) return null
    return mapClient(data as DbRow)
  } catch (err) {
    console.warn('[Supabase:getClient] no disponible:', (err as Error).message)
    return null
  }
}

export async function createClient(clientData: Partial<Client> & { clinicName: string }): Promise<Client | null> {
  try {
    const { data, error } = await getSupabase()
      .from('clients')
      .insert({
        clinic_name:          clientData.clinicName,
        owner_name:           clientData.ownerName           ?? null,
        email:                clientData.email               ?? null,
        phone:                clientData.phone               ?? null,
        instagram:            clientData.instagram           ?? null,
        address:              clientData.address             ?? null,
        status:               clientData.status              ?? 'onboarding',
        onboarding_step:      clientData.onboardingStep      ?? 1,
        onboarding_checklist: clientData.onboardingChecklist ?? [],
        notes:                clientData.notes               ?? null,
      })
      .select()
      .single()

    if (error) { console.error('[Supabase:createClient] error:', error.message); return null }
    if (!data) return null
    return mapClient(data as DbRow)
  } catch (err) {
    console.warn('[Supabase:createClient] no disponible:', (err as Error).message)
    return null
  }
}

export async function updateClient(id: string, updates: Partial<{
  status: Client['status']
  onboardingStep: number
  onboardingChecklist: OnboardingItem[]
  notes: string
  ownerName: string
  email: string
  phone: string
  instagram: string
  address: string
}>): Promise<Client | null> {
  try {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.status              !== undefined) dbUpdates.status               = updates.status
    if (updates.onboardingStep      !== undefined) dbUpdates.onboarding_step      = updates.onboardingStep
    if (updates.onboardingChecklist !== undefined) dbUpdates.onboarding_checklist = updates.onboardingChecklist
    if (updates.notes               !== undefined) dbUpdates.notes                = updates.notes
    if (updates.ownerName           !== undefined) dbUpdates.owner_name           = updates.ownerName
    if (updates.email               !== undefined) dbUpdates.email                = updates.email
    if (updates.phone               !== undefined) dbUpdates.phone                = updates.phone
    if (updates.instagram           !== undefined) dbUpdates.instagram            = updates.instagram
    if (updates.address             !== undefined) dbUpdates.address              = updates.address

    const { data, error } = await getSupabase()
      .from('clients')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) { console.error('[Supabase:updateClient] error:', error.message); return null }
    if (!data) return null
    return mapClient(data as DbRow)
  } catch (err) {
    console.warn('[Supabase:updateClient] no disponible:', (err as Error).message)
    return null
  }
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────

export async function getActivityByAgent(agentId: string): Promise<ActivityLog[]> {
  try {
    const { data, error } = await getSupabase()
      .from('activity_log')
      .select('*')
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (error) { console.error('[Supabase:getActivityByAgent] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapActivityLog, 'getActivityByAgent')
  } catch (err) {
    console.warn('[Supabase:getActivityByAgent] no disponible:', (err as Error).message)
    return []
  }
}

export async function getActivityLog(): Promise<ActivityLog[]> {
  try {
    const { data, error } = await getSupabase()
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })

    if (error) { console.error('[Supabase:getActivityLog] error:', error.message); return [] }
    if (!data || data.length === 0) return []
    return safeMap(data as DbRow[], mapActivityLog, 'getActivityLog')
  } catch (err) {
    console.warn('[Supabase:getActivityLog] no disponible:', (err as Error).message)
    return []
  }
}
