export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/messages — crea un mensaje entre agentes
export async function POST(req: NextRequest) {
  let body: {
    fromAgent?: string
    toAgent?: string
    content?: string
    type?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { fromAgent, toAgent, content, type = 'agent-to-agent' } = body

  if (!fromAgent || !toAgent || !content?.trim()) {
    return NextResponse.json(
      { error: 'fromAgent, toAgent y content son requeridos' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      from_agent: fromAgent,
      to_agent: toAgent,
      content: content.trim(),
      type,
      timestamp: now,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/messages] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message }, { status: 201 })
}
