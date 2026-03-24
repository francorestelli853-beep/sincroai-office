export const dynamic = 'force-dynamic'

import { getLeads } from '@/lib/supabase'
import { LeadsPanel } from '@/components/leads-panel'

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prospectos identificados por los agentes de SincroAI
        </p>
      </div>

      {/* Panel interactivo — client component */}
      <LeadsPanel initialLeads={leads} />
    </div>
  )
}
