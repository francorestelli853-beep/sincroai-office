export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getActivityLog } from '@/lib/supabase'

// GET /api/activity — devuelve activity log real de Supabase
export async function GET() {
  const logs = await getActivityLog()
  return NextResponse.json({ activity: logs, count: logs.length })
}
