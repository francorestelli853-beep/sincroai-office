export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/client-services?client_id=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('client_services')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data || [] })
}

// POST /api/client-services → crear servicio
export async function POST(req: NextRequest) {
  let body: {
    client_id?: string
    name?: string
    description?: string
    duration_minutes?: number
    price?: number
    currency?: string
    active?: boolean
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.client_id || !body.name) {
    return NextResponse.json({ error: 'client_id y name son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('client_services')
    .insert({
      client_id:        body.client_id,
      name:             body.name,
      description:      body.description      ?? null,
      duration_minutes: body.duration_minutes ?? null,
      price:            body.price            ?? null,
      currency:         body.currency         ?? 'ARS',
      active:           body.active           ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data }, { status: 201 })
}
