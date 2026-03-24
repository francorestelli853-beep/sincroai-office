export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/tasks — crea una nueva tarea en Supabase y loguea en activity_log
export async function POST(req: NextRequest) {
  let body: { title?: string; description?: string; assignedTo?: string; priority?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { title, description, assignedTo, priority = 'medium' } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
  }
  if (!assignedTo) {
    return NextResponse.json({ error: 'assignedTo es requerido' }, { status: 400 })
  }

  // Buscar nombre del agente para el activity_log
  const { data: agentRow } = await supabaseAdmin
    .from('agents')
    .select('name, avatar')
    .eq('id', assignedTo)
    .single()

  const agentName: string = agentRow?.name ?? assignedTo
  const now = new Date().toISOString()

  // Insertar tarea
  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: title.trim(),
      description: (description ?? title).trim(),
      assigned_to: assignedTo,
      status: 'pending',
      priority,
      subtasks: [],
      created_at: now,
      completed_at: null,
    })
    .select()
    .single()

  if (taskError) {
    console.error('[POST /api/tasks] error:', taskError.message)
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  // Loguear en activity_log
  await supabaseAdmin.from('activity_log').insert({
    agent_id: assignedTo,
    agent_name: agentName,
    action: `Nueva tarea creada: ${title.trim()}`,
    details: `Asignada a ${agentName} con prioridad ${priority}`,
    category: 'task',
    timestamp: now,
  })

  return NextResponse.json({ task }, { status: 201 })
}
