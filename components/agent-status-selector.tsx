'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgentStatus } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const statusLabel: Record<AgentStatus, string> = {
  active: '🟢 Activo',
  busy: '🟡 Ocupado',
  idle: '⚪ Inactivo',
  offline: '🔴 Offline',
}

export function AgentStatusSelector({
  agentId,
  currentStatus,
}: {
  agentId: string
  currentStatus: AgentStatus
}) {
  const router = useRouter()
  const [status, setStatus] = useState<AgentStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (newStatus: string) => {
    if (newStatus === status) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al actualizar')
        return
      }
      setStatus(newStatus as AgentStatus)
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={status} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(statusLabel) as AgentStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabel[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading && <p className="text-xs text-muted-foreground">Guardando…</p>}
    </div>
  )
}
