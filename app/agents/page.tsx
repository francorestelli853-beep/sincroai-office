export const dynamic = 'force-dynamic'

import { getAgents, getActivityLog } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { AgentsList } from '@/components/agents-list'

export default async function AgentsPage() {
  const [agents, activityLog] = await Promise.all([
    getAgents(),
    getActivityLog(),
  ])

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos los agentes del sistema SincroAI
          </p>
        </div>
        <div title="Disponible en Fase 2">
          <Button disabled>Agregar Agente</Button>
        </div>
      </div>

      {/* TODO: agregar skeleton mientras carga */}
      {/* Lista con filtros (client component) */}
      <AgentsList agents={agents} activityLog={activityLog} />

    </div>
  )
}
