export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/tasks/[id] — actualiza el status de una tarea
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { status } = body
  const validStatuses = ['pending', 'in-progress', 'completed', 'failed']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status inválido. Debe ser uno de: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .update({
      status,
      completed_at: status === 'completed' ? now : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/tasks/:id] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Loguear en activity_log
  const statusLabel: Record<string, string> = {
    'pending': 'pendiente',
    'in-progress': 'en progreso',
    'completed': 'completada',
    'failed': 'fallida',
  }

  await supabaseAdmin.from('activity_log').insert({
    agent_id: task.assigned_to ?? 'system',
    agent_name: 'Sistema',
    action: `Tarea marcada como ${statusLabel[status] ?? status}`,
    details: task.title ?? `Tarea ${id}`,
    category: 'task',
    timestamp: now,
  })

  return NextResponse.json({ task })
}
