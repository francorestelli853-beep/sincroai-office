export const dynamic = 'force-dynamic'

import { getAgents, getActivityLog } from '@/lib/supabase'
import { AgentsList } from '@/components/agents-list'

export default async function AgentsPage() {
  const [agents, activityLog] = await Promise.all([
    getAgents(),
    getActivityLog(),
  ])

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Agentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los agentes del sistema SincroAI
        </p>
      </div>

      {/* Lista con filtros + botón Agregar (client component) */}
      <AgentsList agents={agents} activityLog={activityLog} />

    </div>
  )
}
