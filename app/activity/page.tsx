export const dynamic = 'force-dynamic'

import { getAgents, getActivityLog } from '@/lib/supabase'
import { ActivityClient } from '@/components/activity-client'

// Server Component — fetcha datos reales de Supabase, pasa al client
export default async function ActivityPage() {
  const [agents, logs] = await Promise.all([
    getAgents(),
    getActivityLog(),
  ])

  return (
    <ActivityClient
      logs={logs}
      agents={agents.map((a) => ({ id: a.id, avatar: a.avatar, name: a.name }))}
    />
  )
}
