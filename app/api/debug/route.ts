export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const envUrlExists  = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKeyExists  = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const envUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
  const envKey        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // Si no hay env vars, devolver diagnóstico inmediato
  if (!envUrlExists || !envKeyExists) {
    return NextResponse.json({
      connected:     false,
      envUrlExists,
      envKeyExists,
      error:         'Faltan env vars: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY',
      agentsCount:   null,
      activityCount: null,
      sampleAgent:   null,
    })
  }

  // Crear cliente fresco (no reutilizar el lazy singleton, para aislar el test)
  let client: ReturnType<typeof createClient>
  try {
    client = createClient(envUrl, envKey)
  } catch (err) {
    return NextResponse.json({
      connected:     false,
      envUrlExists,
      envKeyExists,
      error:         `createClient falló: ${(err as Error).message}`,
      agentsCount:   null,
      activityCount: null,
      sampleAgent:   null,
    })
  }

  // Query 1: sample agent (select * limit 1)
  const { data: sampleData, error: sampleError } = await client
    .from('agents')
    .select('*')
    .limit(1)

  // Query 2: count agents
  const { count: agentsCount, error: agentsCountError } = await client
    .from('agents')
    .select('*', { count: 'exact', head: true })

  // Query 3: count activity_log
  const { count: activityCount, error: activityError } = await client
    .from('activity_log')
    .select('*', { count: 'exact', head: true })

  // Query 4: count tasks
  const { count: tasksCount, error: tasksError } = await client
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  // Query 5: count messages
  const { count: messagesCount, error: messagesError } = await client
    .from('messages')
    .select('*', { count: 'exact', head: true })

  const firstError = sampleError ?? agentsCountError ?? activityError ?? tasksError ?? messagesError

  return NextResponse.json({
    connected:     !firstError,
    envUrlExists,
    envKeyExists,
    // Primeros 40 chars de la URL para confirmar cuál Supabase se está usando
    supabaseUrlPrefix: envUrl.slice(0, 40),
    agentsCount,
    activityCount,
    tasksCount,
    messagesCount,
    sampleAgent:   sampleData?.[0] ?? null,
    errors: {
      sampleQuery:   sampleError   ? { code: sampleError.code,       message: sampleError.message,       hint: sampleError.hint }       : null,
      agentsCount:   agentsCountError   ? { code: agentsCountError.code,   message: agentsCountError.message   } : null,
      activityCount: activityError  ? { code: activityError.code,    message: activityError.message,    hint: activityError.hint }    : null,
      tasksCount:    tasksError     ? { code: tasksError.code,        message: tasksError.message        } : null,
      messagesCount: messagesError  ? { code: messagesError.code,     message: messagesError.message     } : null,
    },
  })
}
