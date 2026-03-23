export const dynamic = 'force-dynamic'

import { getAgents, getTasks, getMessages } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { ControlPanel } from '@/components/control-panel'

export default async function ControlPage() {
  const [agents, tasks, messages] = await Promise.all([
    getAgents(),
    getTasks(),
    getMessages(),
  ])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviá órdenes directas a los agentes y monitoreá el progreso en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Operacional</span>
        </div>
      </div>

      {/* Interactive panel (client component) */}
      <ControlPanel agents={agents} tasks={tasks} messages={messages} />

    </div>
  )
}
