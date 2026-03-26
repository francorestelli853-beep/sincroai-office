export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/clients/[id] — actualiza status, checklist, notas, etc.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: {
    status?: string
    onboarding_step?: number
    onboarding_checklist?: { step: number; name: string; done: boolean }[]
    notes?: string
    owner_name?: string
    email?: string
    phone?: string
    instagram?: string
    address?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status               !== undefined) updates.status               = body.status
  if (body.onboarding_step      !== undefined) updates.onboarding_step      = body.onboarding_step
  if (body.onboarding_checklist !== undefined) updates.onboarding_checklist = body.onboarding_checklist
  if (body.notes                !== undefined) updates.notes                = body.notes
  if (body.owner_name           !== undefined) updates.owner_name           = body.owner_name
  if (body.email                !== undefined) updates.email                = body.email
  if (body.phone                !== undefined) updates.phone                = body.phone
  if (body.instagram            !== undefined) updates.instagram            = body.instagram
  if (body.address              !== undefined) updates.address              = body.address

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/clients/:id] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log si cambia el status
  if (body.status) {
    const statusLabels: Record<string, string> = {
      onboarding: 'En onboarding',
      active:     'Activo',
      paused:     'Pausado',
      cancelled:  'Cancelado',
    }
    await supabaseAdmin.from('activity_log').insert({
      agent_id:    'vera',
      agent_name:  'Vera',
      agent_emoji: '⚡',
      type:        'task',
      description: `Cliente "${client?.clinic_name ?? id}" → ${statusLabels[body.status] ?? body.status}`,
      timestamp:   new Date().toISOString(),
    })
  }

  // Log si se actualiza el checklist
  if (body.onboarding_checklist) {
    const completedItem = body.onboarding_checklist.find(
      (item) => item.done
    )
    if (completedItem) {
      await supabaseAdmin.from('activity_log').insert({
        agent_id:    'vera',
        agent_name:  'Vera',
        agent_emoji: '⚡',
        type:        'task',
        description: `Paso completado: "${completedItem.name}" — ${client?.clinic_name ?? id}`,
        timestamp:   new Date().toISOString(),
      })
    }
  }

  return NextResponse.json({ client })
}
