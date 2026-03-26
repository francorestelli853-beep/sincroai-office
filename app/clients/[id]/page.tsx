export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getClient, getClientServices, getClientSchedule } from '@/lib/supabase'
import { ClientDetailPanel } from '@/components/client-detail-panel'

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [client, services, schedule] = await Promise.all([
    getClient(params.id),
    getClientServices(params.id),
    getClientSchedule(params.id),
  ])

  if (!client) notFound()

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <ClientDetailPanel
        client={client}
        initialServices={services}
        initialSchedule={schedule}
      />
    </main>
  )
}
