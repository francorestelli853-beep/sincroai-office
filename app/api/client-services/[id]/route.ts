export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/client-services/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: {
    name?: string
    description?: string
    duration_minutes?: number | null
    price?: number | null
    currency?: string
    active?: boolean
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name             !== undefined) updates.name             = body.name
  if (body.description      !== undefined) updates.description      = body.description
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes
  if (body.price            !== undefined) updates.price            = body.price
  if (body.currency         !== undefined) updates.currency         = body.currency
  if (body.active           !== undefined) updates.active           = body.active

  const { data, error } = await supabaseAdmin
    .from('client_services')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

// DELETE /api/client-services/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await supabaseAdmin
    .from('client_services')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
