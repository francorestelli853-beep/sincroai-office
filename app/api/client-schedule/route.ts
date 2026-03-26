export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/client-schedule?client_id=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('client_schedule')
    .select('*')
    .eq('client_id', clientId)
    .order('day_of_week', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data || [] })
}

// POST /api/client-schedule → upsert las 7 filas del horario
export async function POST(req: NextRequest) {
  let body: {
    client_id?: string
    rows?: {
      day_of_week: number
      open_time: string
      close_time: string
      slot_duration_minutes?: number
      active: boolean
    }[]
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.client_id || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'client_id y rows son requeridos' }, { status: 400 })
  }

  const rowsToUpsert = body.rows.map(r => ({
    client_id:             body.client_id,
    day_of_week:           r.day_of_week,
    open_time:             r.open_time,
    close_time:            r.close_time,
    slot_duration_minutes: r.slot_duration_minutes ?? 60,
    active:                r.active,
  }))

  const { data, error } = await supabaseAdmin
    .from('client_schedule')
    .upsert(rowsToUpsert, { onConflict: 'client_id,day_of_week' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data || [] })
}
