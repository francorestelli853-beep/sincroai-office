export const dynamic = 'force-dynamic'

import { getClients } from '@/lib/supabase'
import { ClientsPanel } from '@/components/clients-panel'

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clínicas con SincroAI activo — estado de onboarding y operación
        </p>
      </div>

      <ClientsPanel initialClients={clients} />
    </div>
  )
}
