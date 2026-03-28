'use client'

import { useState, useMemo, useCallback } from 'react'
import { Building2, Mail, Phone, Instagram, MapPin, ChevronRight, Plus, X, Check, Circle, Globe, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Client, OnboardingItem } from '@/lib/supabase'

// ─── Helpers ────────────────────────────────────────────────────────────────────

type ClientStatus = Client['status']

const STATUS_CONFIG: Record<ClientStatus, { label: string; dot: string; badge: string }> = {
  onboarding: {
    label: 'Onboarding',
    dot:   'bg-violet-400 animate-pulse',
    badge: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  },
  active: {
    label: 'Activo',
    dot:   'bg-emerald-400 animate-pulse',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  },
  paused: {
    label: 'Pausado',
    dot:   'bg-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  },
  cancelled: {
    label: 'Cancelado',
    dot:   'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function progressPct(checklist: OnboardingItem[]): number {
  if (!checklist.length) return 0
  return Math.round((checklist.filter((i) => i.done).length / checklist.length) * 100)
}

// ─── Status Badge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.onboarding
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cfg.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────────

function ProgressBar({ checklist, compact = false }: { checklist: OnboardingItem[]; compact?: boolean }) {
  const pct = progressPct(checklist)
  const done = checklist.filter((i) => i.done).length
  const total = checklist.length

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Onboarding</span>
          <span>{done}/{total} pasos · {pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-gray-700/60">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            pct === 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-violet-500' : 'bg-violet-600/70'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Client Card ─────────────────────────────────────────────────────────────────

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all duration-150 hover:border-violet-500/40 hover:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{client.clinicName}</p>
            {client.ownerName && (
              <p className="text-xs text-gray-400 truncate">{client.ownerName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={client.status} />
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        </div>
      </div>

      {/* Progress */}
      {client.onboardingChecklist.length > 0 && (
        <div className="mt-3">
          <ProgressBar checklist={client.onboardingChecklist} compact />
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
            <span>{client.onboardingChecklist.filter((i) => i.done).length}/{client.onboardingChecklist.length} pasos</span>
            <span>{progressPct(client.onboardingChecklist)}%</span>
          </div>
        </div>
      )}

      {/* Contact row */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        {client.email && (
          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
        )}
        {client.phone && (
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
        )}
        {client.instagram && (
          <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />{client.instagram}</span>
        )}
        {client.address && (
          <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{client.address}</span>
        )}
      </div>

      <p className="mt-2 text-[11px] text-gray-600">Alta: {formatDate(client.createdAt)}</p>
    </button>
  )
}

// ─── Checklist Item ──────────────────────────────────────────────────────────────

function ChecklistItem({
  item,
  onToggle,
  disabled,
}: {
  item: OnboardingItem
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
        disabled ? 'cursor-default' : 'hover:bg-gray-800/60 cursor-pointer',
        item.done ? 'text-gray-400' : 'text-gray-200'
      )}
    >
      <span className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
        item.done
          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
          : 'border-gray-600 text-gray-600'
      )}>
        {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-0" />}
      </span>
      <span className={cn('flex-1 text-left', item.done && 'line-through opacity-60')}>
        {item.name}
      </span>
      <span className="text-xs text-gray-600">Paso {item.step}</span>
    </button>
  )
}

// ─── Generar Web (inline en dialog) ─────────────────────────────────────────────

function GenerateWebInlineButton({ clientId, clinicName }: { clientId: string; clinicName: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setErr(null)
    setDone(false)
    try {
      const res = await fetch(`/api/clients/${clientId}/generate-web`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Error al generar')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const fileName = match?.[1] ?? `web-${clinicName.toLowerCase().replace(/\s+/g, '-')}.html`
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (e) {
      setErr((e as Error).message)
      setTimeout(() => setErr(null), 5000)
    } finally {
      setLoading(false)
    }
  }, [clientId, clinicName])

  if (err) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 text-center">
        {err}
      </div>
    )
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
        done
          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
          : 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-900/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
      )}
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" />Generando web…</>
      ) : done ? (
        <><Check className="h-4 w-4" />Descargando…</>
      ) : (
        <><Globe className="h-4 w-4" />Generar Web del Cliente</>
      )}
    </button>
  )
}

// ─── Detail Dialog ───────────────────────────────────────────────────────────────

function ClientDetailDialog({
  client,
  onClose,
  onUpdate,
}: {
  client: Client
  onClose: () => void
  onUpdate: (updated: Client) => void
}) {
  const [localClient, setLocalClient] = useState<Client>(client)
  const [saving, setSaving] = useState(false)

  const handleToggleStep = async (stepIndex: number) => {
    const newChecklist = localClient.onboardingChecklist.map((item, idx) =>
      idx === stepIndex ? { ...item, done: !item.done } : item
    )
    const doneCount = newChecklist.filter((i) => i.done).length
    const newStep = doneCount + 1
    const allDone = doneCount === newChecklist.length

    const optimistic: Client = {
      ...localClient,
      onboardingChecklist: newChecklist,
      onboardingStep: newStep,
      status: allDone ? 'active' : localClient.status,
    }
    setLocalClient(optimistic)

    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${localClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding_checklist: newChecklist,
          onboarding_step: newStep,
          ...(allDone && { status: 'active' }),
        }),
      })
      if (res.ok) {
        const { client: updated } = await res.json() as { client: Client }
        if (updated) {
          const mapped: Client = {
            ...optimistic,
            ...updated,
            onboardingChecklist: newChecklist,
            createdAt: new Date(updated.createdAt ?? optimistic.createdAt),
          }
          setLocalClient(mapped)
          onUpdate(mapped)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: ClientStatus) => {
    setLocalClient((prev) => ({ ...prev, status }))
    await fetch(`/api/clients/${localClient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onUpdate({ ...localClient, status })
  }

  const pct = progressPct(localClient.onboardingChecklist)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-800 bg-gray-900 p-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white truncate">{localClient.clinicName}</h2>
              {localClient.ownerName && (
                <p className="text-sm text-gray-400">{localClient.ownerName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Status:</span>
            {(['onboarding', 'active', 'paused', 'cancelled'] as ClientStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  localClient.status === s
                    ? STATUS_CONFIG[s].badge + ' ring-1 ring-offset-1 ring-offset-gray-900'
                    : 'text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700'
                )}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {localClient.onboardingChecklist.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4 space-y-2">
              <ProgressBar checklist={localClient.onboardingChecklist} />
              {pct === 100 && (
                <p className="text-xs text-emerald-400 font-medium">✓ Onboarding completo</p>
              )}
            </div>
          )}

          {/* Checklist */}
          {localClient.onboardingChecklist.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Checklist de onboarding {saving && <span className="text-violet-400 normal-case">· guardando…</span>}
              </p>
              <div className="rounded-xl border border-gray-800 divide-y divide-gray-800/60">
                {localClient.onboardingChecklist.map((item, idx) => (
                  <ChecklistItem
                    key={item.step}
                    item={item}
                    onToggle={() => handleToggleStep(idx)}
                    disabled={saving}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Contacto</p>
            <div className="space-y-2 text-sm">
              {localClient.email && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <a href={`mailto:${localClient.email}`} className="hover:text-violet-400 transition-colors truncate">{localClient.email}</a>
                </div>
              )}
              {localClient.phone && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <a href={`tel:${localClient.phone}`} className="hover:text-violet-400 transition-colors">{localClient.phone}</a>
                </div>
              )}
              {localClient.instagram && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Instagram className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span>{localClient.instagram}</span>
                </div>
              )}
              {localClient.address && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span>{localClient.address}</span>
                </div>
              )}
            </div>
          </div>

          {localClient.notes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Notas</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{localClient.notes}</p>
            </div>
          )}

          <p className="text-xs text-gray-600">Alta: {formatDate(localClient.createdAt)}</p>

          {/* Acciones web */}
          <div className="pt-1 border-t border-gray-800 flex flex-col gap-2">
            <GenerateWebInlineButton clientId={localClient.id} clinicName={localClient.clinicName} />
            <Link
              href={`/clients/${localClient.id}`}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver detalle completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Client Dialog ───────────────────────────────────────────────────────────

function AddClientDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Client) => void }) {
  const [form, setForm] = useState({
    clinic_name: '', owner_name: '', email: '', phone: '', instagram: '', address: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clinic_name.trim()) { setError('El nombre de la clínica es requerido'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json() as { client?: Client; error?: string }
      if (!res.ok) { setError(json.error ?? 'Error al crear cliente'); return }
      if (json.client) onAdd(json.client as Client)
      onClose()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, placeholder?: string, type = 'text') => (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Nuevo cliente</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {field('Nombre de la clínica *', 'clinic_name', 'Ej: Clínica Estética Soler')}
        {field('Propietario/Contacto', 'owner_name', 'Nombre completo')}
        {field('Email', 'email', 'correo@ejemplo.com', 'email')}
        {field('Teléfono', 'phone', '+54 9 11 1234-5678', 'tel')}
        {field('Instagram', 'instagram', '@clinica_ejemplo')}
        {field('Dirección', 'address', 'Calle 123, Ciudad')}

        <div>
          <label className="mb-1 block text-xs text-gray-400">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Notas adicionales..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando…' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────────

export function ClientsPanel({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Client | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !search ||
        c.clinicName.toLowerCase().includes(search.toLowerCase()) ||
        (c.ownerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [clients, search, statusFilter])

  const kpis = useMemo(() => {
    const onboarding = clients.filter((c) => c.status === 'onboarding').length
    const active     = clients.filter((c) => c.status === 'active').length
    const paused     = clients.filter((c) => c.status === 'paused').length
    const avgPct     = clients.length
      ? Math.round(clients.reduce((acc, c) => acc + progressPct(c.onboardingChecklist), 0) / clients.length)
      : 0
    return { onboarding, active, paused, avgPct }
  }, [clients])

  const handleUpdate = (updated: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const handleAdd = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev])
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard label="Total" value={clients.length} sub="clientes" />
        <KPICard label="Onboarding" value={kpis.onboarding} sub="en proceso" />
        <KPICard label="Activos" value={kpis.active} sub="operativos" />
        <KPICard label="Progreso prom." value={`${kpis.avgPct}%`} sub="checklist" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clínica, contacto…"
            className="w-full max-w-xs rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos los status</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Activos</option>
            <option value="paused">Pausados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16 text-center">
          <Building2 className="h-8 w-8 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">
            {clients.length === 0 ? 'No hay clientes todavía' : 'Sin resultados para los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setSelected(client)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selected && (
        <ClientDetailDialog
          client={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
      {showAdd && (
        <AddClientDialog
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}
