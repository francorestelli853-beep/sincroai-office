export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/leads/[id] — actualiza stage, assigned_agent, notes, last_contact
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: {
    stage?: string
    assignedAgent?: string
    notes?: string
    lastContact?: string
    demoUrl?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.stage !== undefined) updates.stage = body.stage
  if (body.assignedAgent !== undefined) updates.assigned_agent = body.assignedAgent
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.lastContact !== undefined) updates.last_contact = body.lastContact
  if (body.demoUrl !== undefined) updates.demo_url = body.demoUrl

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/leads/:id] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Loguear cambio de stage en activity_log
  if (body.stage) {
    const stageLabels: Record<string, string> = {
      new: 'Nuevo', contacted: 'Contactado', interested: 'Interesado',
      proposal_sent: 'Propuesta enviada', demo_sent: 'Demo enviada',
      closed: 'Cerrado', lost: 'Perdido',
    }
    await supabaseAdmin.from('activity_log').insert({
      agent_id:   body.assignedAgent ?? 'system',
      agent_name: 'Sistema',
      action:     `Lead "${lead?.clinic_name ?? id}" → ${stageLabels[body.stage] ?? body.stage}`,
      details:    `Stage actualizado a "${stageLabels[body.stage] ?? body.stage}"`,
      category:   'task',
      timestamp:  new Date().toISOString(),
    })

    // Webhook a Vera cuando el lead pasa a "closed"
    if (body.stage === 'closed' && lead) {
      try {
        const webhookRes = await fetch('https://n8n.srv1306548.hstgr.cloud/webhook/vera-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'client_closed',
            agent_id:   'vera',
            agent_name: 'Vera',
            data: {
              lead_id:      lead.id,
              clinic_name:  lead.clinic_name  ?? null,
              contact_name: lead.contact_name ?? null,
              email:        lead.email        ?? null,
              phone:        lead.phone        ?? null,
              instagram:    lead.instagram    ?? null,
              address:      lead.address      ?? null,
            },
          }),
        })
        if (!webhookRes.ok) {
          console.warn('[vera-onboarding webhook] respuesta no-OK:', webhookRes.status, await webhookRes.text())
        } else {
          console.log('[vera-onboarding webhook] enviado OK para lead:', lead.id)
        }
      } catch (webhookErr) {
        // No fallar la respuesta al cliente si el webhook no está disponible
        console.error('[vera-onboarding webhook] error de red:', (webhookErr as Error).message)
      }
    }
  }

  return NextResponse.json({ lead })
}
