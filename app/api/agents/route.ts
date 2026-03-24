export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/agents — crea un nuevo agente en Supabase
export async function POST(req: NextRequest) {
  let body: {
    name?: string
    role?: string
    personality?: string
    tools?: string[]
    objective?: string
    avatar?: string
    status?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { name, role, personality, tools = [], objective, avatar = '🤖', status = 'idle' } = body

  if (!name?.trim() || !role?.trim() || !objective?.trim()) {
    return NextResponse.json(
      { error: 'name, role y objective son requeridos' },
      { status: 400 }
    )
  }

  // Generar ID desde el nombre: "Mi Agente" → "mi-agente"
  const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const now = new Date().toISOString()

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .insert({
      id,
      name: name.trim(),
      role: role.trim(),
      personality: personality?.trim() ?? '',
      tools: Array.isArray(tools) ? tools : [],
      objective: objective.trim(),
      avatar,
      status,
      last_active: now,
      created_at: now,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/agents] error:', error.message)
    // Si el ID ya existe, devolver error descriptivo
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Ya existe un agente con el ID "${id}". Elegí un nombre diferente.` },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Loguear en activity_log
  await supabaseAdmin.from('activity_log').insert({
    agent_id: id,
    agent_name: name.trim(),
    action: 'Agente creado',
    details: `Nuevo agente "${name}" (${role}) agregado al sistema`,
    category: 'system',
    timestamp: now,
  })

  return NextResponse.json({ agent }, { status: 201 })
}
