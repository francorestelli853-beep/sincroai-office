'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RefreshButton({ label = 'Refrescar' }: { label?: string }) {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 1000)
  }

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-800 hover:text-white"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
      {label}
    </button>
  )
}
