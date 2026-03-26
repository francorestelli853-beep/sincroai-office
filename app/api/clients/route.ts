export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DEFAULT_CHECKLIST = [
  { step: 1, name: 'Registro creado',                done: true  },
  { step: 2, name: 'Web generada',                   done: false },
  { step: 3, name: 'Workflows n8n configurados',     done: false },
  { step: 4, name: 'Chatbot WhatsApp conectado',     done: false },
  { step: 5, name: 'Chatbot Instagram conectado',    done: false },
  { step: 6, name: 'ManyChat configurado',           done: false },
  { step: 7, name: 'Testing completo',               done: false },
  { step: 8, name: 'Cliente activo',                 done: false },
]

// GET /api/clients — lista todos los clientes
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data || [] })
}

// POST /api/clients — crea un cliente nuevo
export async function POST(req: NextRequest) {
  let body: {
    clinic_name?: string
    owner_name?: string
    email?: string
    phone?: string
    instagram?: string
    address?: string
    notes?: string
    status?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.clinic_name) {
    return NextResponse.json({ error: 'clinic_name es requerido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert({
      clinic_name:          body.clinic_name,
      owner_name:           body.owner_name   ?? null,
      email:                body.email        ?? null,
      phone:                body.phone        ?? null,
      instagram:            body.instagram    ?? null,
      address:              body.address      ?? null,
      notes:                body.notes        ?? null,
      status:               body.status       ?? 'onboarding',
      onboarding_step:      1,
      onboarding_checklist: DEFAULT_CHECKLIST,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log en activity_log
  await supabaseAdmin.from('activity_log').insert({
    agent_id:    'vera',
    agent_name:  'Vera',
    agent_emoji: '⚡',
    type:        'task',
    description: `Cliente creado: ${body.clinic_name}`,
    timestamp:   new Date().toISOString(),
  })

  return NextResponse.json({ client: data }, { status: 201 })
}
