export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/agents/[id] — actualiza un agente (status u otros campos)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: {
    status?: string
    name?: string
    role?: string
    personality?: string
    tools?: string[]
    objective?: string
    avatar?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  // Solo incluir los campos que vienen en el body
  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) updates.status = body.status
  if (body.name !== undefined) updates.name = body.name
  if (body.role !== undefined) updates.role = body.role
  if (body.personality !== undefined) updates.personality = body.personality
  if (body.tools !== undefined) updates.tools = body.tools
  if (body.objective !== undefined) updates.objective = body.objective
  if (body.avatar !== undefined) updates.avatar = body.avatar

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/agents/:id] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Loguear cambio de status
  if (body.status) {
    const statusLabel: Record<string, string> = {
      active: 'Activo', busy: 'Ocupado', idle: 'Inactivo', offline: 'Offline',
    }
    await supabaseAdmin.from('activity_log').insert({
      agent_id: id,
      agent_name: agent?.name ?? id,
      action: `Status cambiado a ${statusLabel[body.status] ?? body.status}`,
      details: `El agente ${agent?.name ?? id} ahora está ${statusLabel[body.status] ?? body.status}`,
      category: 'system',
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ agent })
}
