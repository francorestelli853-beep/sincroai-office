export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/follow-up
 *
 * Vercel Cron (Nexo) — se ejecuta a las 14:00 UTC (11am Argentina) todos los días.
 * Envía un máximo de 2 follow-ups por día:
 *   - Follow-up 1: leads en stage 'demo_sent' sin respuesta hace 3+ días
 *   - Follow-up 2: leads con follow_up_1_at hace 7+ días
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

const DAILY_FOLLOW_UP_LIMIT = 2

type FollowUpType = 'follow_up_1' | 'follow_up_2'

function buildFollowUpEmail(
  type: FollowUpType,
  toName: string,
  clinicName: string,
  demoUrl?: string
): { subject: string; text: string } {
  const name = toName || clinicName

  if (type === 'follow_up_1') {
    return {
      subject: `Re: ${clinicName}`,
      text: `Hola ${name}, te escribí hace unos días.

No sé si llegaste a ver la propuesta que armé para ${clinicName}${demoUrl ? `:\n${demoUrl}` : '.'}

Cualquier cosa me escribís.

Franco`,
    }
  }

  // follow_up_2
  return {
    subject: `Re: ${clinicName}`,
    text: `${name}, último mensaje de mi parte.

Si en algún momento necesitás automatizar turnos o respuestas en ${clinicName}, escribime directo al WhatsApp:
wa.me/5491140682555

Franco`,
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return NextResponse.json({ error: 'RESEND_API_KEY no configurado' }, { status: 500 })

  const resend = new Resend(RESEND_KEY)

  const now          = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let totalSent = 0
  const errors: string[] = []
  const results: Array<{ clinic: string; type: string; status: 'ok' | 'error'; error?: string }> = []

  // ── Follow-up 1: leads en demo_sent sin follow-up, last_contact hace 3+ días ──
  if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
    const { data: leads1 } = await supabaseAdmin
      .from('leads')
      .select('id, clinic_name, contact_name, owner_name, email, demo_url')
      .in('stage', ['demo_sent', 'contactado'])
      .eq('follow_up_count', 0)
      .lt('last_contact', threeDaysAgo)
      .not('email', 'is', null)
      .order('last_contact', { ascending: true })
      .limit(DAILY_FOLLOW_UP_LIMIT - totalSent)

    for (const lead of (leads1 ?? [])) {
      if (totalSent >= DAILY_FOLLOW_UP_LIMIT) break
      const toName = lead.owner_name || lead.contact_name || lead.clinic_name
      const email  = buildFollowUpEmail('follow_up_1', toName, lead.clinic_name, lead.demo_url)

      try {
        const { error: resendErr } = await resend.emails.send({
          from:    'Franco de SincroAI <franco@sincroai.net>',
          to:      lead.email,
          subject: email.subject,
          text:    email.text,
        })

        if (resendErr) throw new Error(resendErr.message)

        await supabaseAdmin.from('leads').update({
          follow_up_count: 1,
          follow_up_1_at:  now.toISOString(),
          last_contact:    now.toISOString(),
        }).eq('id', lead.id)

        await supabaseAdmin.from('activity_log').insert({
          agent_id:   'nexo',
          agent_name: 'Nexo',
          type:       'action',
          description: `Follow-up 1 enviado a ${toName} (${lead.clinic_name})`,
        })

        totalSent++
        results.push({ clinic: lead.clinic_name, type: 'follow_up_1', status: 'ok' })
      } catch (e: unknown) {
        const msg = (e as Error).message
        errors.push(`FU1 ${lead.clinic_name}: ${msg}`)
        results.push({ clinic: lead.clinic_name, type: 'follow_up_1', status: 'error', error: msg })
      }

      if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
        await new Promise((r) => setTimeout(r, 15000))
      }
    }
  }

  // ── Follow-up 2: leads con 1 follow-up hace 7+ días del primero ──────────────
  if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
    const { data: leads2 } = await supabaseAdmin
      .from('leads')
      .select('id, clinic_name, contact_name, owner_name, email')
      .in('stage', ['demo_sent', 'contactado'])
      .eq('follow_up_count', 1)
      .lt('follow_up_1_at', sevenDaysAgo)
      .not('email', 'is', null)
      .order('follow_up_1_at', { ascending: true })
      .limit(DAILY_FOLLOW_UP_LIMIT - totalSent)

    for (const lead of (leads2 ?? [])) {
      if (totalSent >= DAILY_FOLLOW_UP_LIMIT) break
      const toName = lead.owner_name || lead.contact_name || lead.clinic_name
      const email  = buildFollowUpEmail('follow_up_2', toName, lead.clinic_name)

      try {
        const { error: resendErr } = await resend.emails.send({
          from:    'Franco de SincroAI <franco@sincroai.net>',
          to:      lead.email,
          subject: email.subject,
          text:    email.text,
        })

        if (resendErr) throw new Error(resendErr.message)

        await supabaseAdmin.from('leads').update({
          follow_up_count: 2,
          follow_up_2_at:  now.toISOString(),
          last_contact:    now.toISOString(),
          stage:           'closed_lost',
        }).eq('id', lead.id)

        await supabaseAdmin.from('activity_log').insert({
          agent_id:   'nexo',
          agent_name: 'Nexo',
          type:       'action',
          description: `Follow-up 2 (final) enviado a ${toName} (${lead.clinic_name})`,
        })

        totalSent++
        results.push({ clinic: lead.clinic_name, type: 'follow_up_2', status: 'ok' })
      } catch (e: unknown) {
        const msg = (e as Error).message
        errors.push(`FU2 ${lead.clinic_name}: ${msg}`)
        results.push({ clinic: lead.clinic_name, type: 'follow_up_2', status: 'error', error: msg })
      }

      if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
        await new Promise((r) => setTimeout(r, 15000))
      }
    }
  }

  if (totalSent > 0) {
    await supabaseAdmin.from('activity_log').insert({
      agent_id:   'nexo',
      agent_name: 'Nexo',
      type:       'action',
      description: `Cron: ${totalSent} follow-ups enviados`,
    })
  }

  return NextResponse.json({ follow_ups_sent: totalSent, results, errors })
}
