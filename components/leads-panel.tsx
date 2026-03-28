'use client'

import { useState, useMemo } from 'react'
import {
  Phone, Mail, Instagram, MapPin, Star, Plus,
  ChevronDown, ExternalLink, X, Search, Link2, Send, Check, Loader2,
} from 'lucide-react'
import { Lead } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const STAGES: { value: string; label: string; variant: 'secondary' | 'default' | 'warning' | 'success' | 'destructive' | 'outline' | 'demo' | null | undefined }[] = [
  { value: 'new',           label: 'Nuevo',            variant: 'secondary' },
  { value: 'contacted',     label: 'Contactado',       variant: 'default' },
  { value: 'interested',    label: 'Interesado',       variant: 'warning' },
  { value: 'proposal_sent', label: 'Propuesta',        variant: 'outline' },
  { value: 'demo_sent',     label: 'Demo Enviada',     variant: 'demo' },
  { value: 'closed',        label: 'Cerrado',          variant: 'success' },
  { value: 'lost',          label: 'Perdido',          variant: 'destructive' },
]

const AGENT_AVATARS: Record<string, string> = {
  luna: '🔍', marco: '🤝', vera: '⚡', atlas: '🛡️', nova: '📊',
}

type SortOption = 'date' | 'score' | 'name'

function timeAgo(date: Date | string | null): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ─── SCORE BAR ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-700">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-300">{score}</span>
    </div>
  )
}

// ─── LEAD DETAIL DIALOG ────────────────────────────────────────────────────────

function LeadDetailDialog({
  lead,
  open,
  onClose,
  onUpdated,
}: {
  lead: Lead
  open: boolean
  onClose: () => void
  onUpdated: (updated: Lead) => void
}) {
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [stage, setStage] = useState(lead.stage)
  const [demoUrl, setDemoUrl] = useState(lead.demoUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [savingDemo, setSavingDemo] = useState(false)
  const [sendingDemo, setSendingDemo] = useState(false)
  const [demoSent, setDemoSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoMsg, setDemoMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const stageInfo = STAGES.find((s) => s.value === stage)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          notes,
          lastContact: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      onUpdated({ ...lead, stage, notes, demoUrl: demoUrl || null, lastContact: new Date() })
      onClose()
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDemoUrl = async () => {
    setSavingDemo(true)
    setDemoMsg(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoUrl: demoUrl.trim() || null }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Error al guardar')
      }
      setDemoMsg({ text: 'Demo URL guardada', type: 'ok' })
      setTimeout(() => setDemoMsg(null), 3000)
    } catch (e) {
      setDemoMsg({ text: (e as Error).message, type: 'err' })
    } finally {
      setSavingDemo(false)
    }
  }

  const handleSendDemo = async () => {
    if (!lead.email) { setDemoMsg({ text: 'El lead no tiene email', type: 'err' }); return }
    if (!demoUrl.trim()) { setDemoMsg({ text: 'Primero guardá la Demo URL', type: 'err' }); return }
    setSendingDemo(true)
    setDemoMsg(null)
    try {
      const res = await fetch('/api/outreach/send-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id:      lead.id,
          clinic_name:  lead.clinicName,
          contact_name: lead.contactName ?? lead.clinicName,
          email:        lead.email,
          demo_url:     demoUrl.trim(),
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      setDemoSent(true)
      setDemoMsg({ text: '✅ Demo enviada por email', type: 'ok' })
      onUpdated({ ...lead, stage: 'demo_sent', demoUrl: demoUrl.trim(), lastContact: new Date() })
    } catch (e) {
      setDemoMsg({ text: (e as Error).message, type: 'err' })
    } finally {
      setSendingDemo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.clinicName}</DialogTitle>
          <DialogDescription>{lead.location ?? 'Sin ubicación'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stage selector */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</p>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {lead.contactName && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Contacto</p>
                <p className="mt-0.5 text-sm font-medium text-white">{lead.contactName}</p>
              </div>
            )}
            {lead.leadScore !== null && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Lead Score</p>
                <ScoreBar score={lead.leadScore} />
              </div>
            )}
            {lead.email && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <a href={`mailto:${lead.email}`} className="mt-0.5 text-sm text-violet-400 hover:underline break-all">
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <a href={`tel:${lead.phone}`} className="mt-0.5 text-sm text-violet-400 hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.instagram && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Instagram</p>
                <a
                  href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-0.5 flex items-center gap-1 text-sm text-violet-400 hover:underline"
                >
                  {lead.instagram} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {lead.foundBy && (
              <div className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-muted-foreground">Encontrado por</p>
                <p className="mt-0.5 text-sm text-white">
                  {AGENT_AVATARS[lead.foundBy] ?? '🤖'} {lead.foundBy}
                </p>
              </div>
            )}
          </div>

          {lead.address && (
            <div className="flex items-start gap-2 rounded-lg bg-gray-800/50 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-gray-300">{lead.address}</p>
            </div>
          )}

          {/* Demo URL */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Demo URL
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://clinica-demo.netlify.app"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDemoUrl}
                disabled={savingDemo}
                className="shrink-0"
              >
                {savingDemo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
              </Button>
            </div>

            {/* Botón Enviar Demo — visible solo si hay URL */}
            {demoUrl.trim() && (
              <Button
                className="w-full gap-2"
                onClick={handleSendDemo}
                disabled={sendingDemo || demoSent || !lead.email}
              >
                {sendingDemo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Enviando email…</>
                ) : demoSent ? (
                  <><Check className="h-4 w-4" />Demo enviada</>
                ) : (
                  <><Send className="h-4 w-4" />Enviar Demo por Email</>
                )}
              </Button>
            )}
            {!lead.email && demoUrl.trim() && (
              <p className="text-xs text-amber-400">⚠ Este lead no tiene email registrado</p>
            )}

            {/* Feedback demo */}
            {demoMsg && (
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                demoMsg.type === 'ok'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border border-red-500/30 bg-red-500/10 text-red-400'
              )}>
                {demoMsg.text}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notas</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre este lead…"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <X className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ADD LEAD DIALOG ───────────────────────────────────────────────────────────

type AddLeadForm = {
  clinicName: string; contactName: string; email: string
  phone: string; instagram: string; location: string
  address: string; notes: string; stage: string
}

const EMPTY_LEAD: AddLeadForm = {
  clinicName: '', contactName: '', email: '', phone: '',
  instagram: '', location: '', address: '', notes: '', stage: 'new',
}

function AddLeadDialog({
  open, onClose, onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (lead: Lead) => void
}) {
  const [form, setForm] = useState<AddLeadForm>(EMPTY_LEAD)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof AddLeadForm, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.clinicName.trim()) { setError('El nombre de la clínica es requerido'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_name:  form.clinicName.trim(),
          contact_name: form.contactName.trim() || null,
          email:        form.email.trim() || null,
          phone:        form.phone.trim() || null,
          instagram:    form.instagram.trim() || null,
          location:     form.location.trim() || null,
          address:      form.address.trim() || null,
          notes:        form.notes.trim() || null,
          stage:        form.stage,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear'); return }
      const raw = data.lead
      const newLead: Lead = {
        id: raw.id, leadNumber: raw.lead_number ?? null,
        clinicName: raw.clinic_name, location: raw.location ?? null,
        contactName: raw.contact_name ?? null, email: raw.email ?? null,
        phone: raw.phone ?? null, stage: raw.stage ?? 'new',
        assignedAgent: raw.assigned_agent ?? null, instagram: raw.instagram ?? null,
        address: raw.address ?? null, leadScore: raw.lead_score ?? null,
        foundBy: raw.found_by ?? null, source: raw.source ?? null,
        notes: raw.notes ?? null, demoUrl: raw.demo_url ?? null,
        lastContact: raw.last_contact ? new Date(raw.last_contact) : null,
        createdAt: new Date(raw.created_at),
      }
      onCreated(newLead)
      setForm(EMPTY_LEAD)
      onClose()
    } catch { setError('Error de red') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Lead</DialogTitle>
          <DialogDescription>Creá un nuevo prospecto manualmente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Clínica *</label>
            <Input value={form.clinicName} onChange={(e) => set('clinicName', e.target.value)} placeholder="Nombre de la clínica" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Contacto</label>
            <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Nombre" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Teléfono</label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+54 11..." />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@clinica.com" type="email" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Instagram</label>
            <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@clinica" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ubicación</label>
            <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ciudad, Prov" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stage</label>
            <Select value={form.stage} onValueChange={(v) => set('stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notas</label>
            <textarea
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Observaciones…" rows={2}
              className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
          </div>
          {error && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <X className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando…' : 'Crear Lead'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── LEAD CARD ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, rowNumber, onClick, onStageChange }: {
  lead: Lead
  rowNumber: number | null
  onClick: () => void
  onStageChange: (id: string, stage: string) => Promise<void>
}) {
  const [changingStage, setChangingStage] = useState(false)
  const stageInfo = STAGES.find((s) => s.value === lead.stage)

  const handleStageChange = async (newStage: string) => {
    setChangingStage(true)
    await onStageChange(lead.id, newStage)
    setChangingStage(false)
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-gray-600"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex items-start gap-2">
            {rowNumber !== null && (
              <span className="mt-0.5 shrink-0 rounded bg-gray-700/70 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400">
                #{rowNumber}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{lead.clinicName}</p>
              {lead.location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {lead.location}
                </p>
              )}
            </div>
          </div>
          <Badge variant={stageInfo?.variant ?? 'secondary'} className="shrink-0 text-[10px]">
            {stageInfo?.label ?? lead.stage}
          </Badge>
        </div>

        {/* Score */}
        {lead.leadScore !== null && (
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
            <ScoreBar score={lead.leadScore} />
          </div>
        )}

        {/* Contact icons */}
        <div className="flex flex-wrap items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-blue-400 hover:bg-blue-400/10">
              <Phone className="h-3 w-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-violet-400 hover:bg-violet-400/10">
              <Mail className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{lead.email}</span>
            </a>
          )}
          {lead.instagram && (
            <a
              href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-pink-400 hover:bg-pink-400/10"
            >
              <Instagram className="h-3 w-3" /> {lead.instagram}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {lead.foundBy && (
              <span>{AGENT_AVATARS[lead.foundBy] ?? '🤖'} {lead.foundBy}</span>
            )}
            <span className="mx-1">·</span>
            <span>{formatDate(lead.createdAt)}</span>
          </div>

          {/* Stage quick-change */}
          <Select value={lead.stage} onValueChange={handleStageChange} disabled={changingStage}>
            <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent px-1 text-[11px] text-muted-foreground hover:text-white">
              <ChevronDown className="h-3 w-3" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── MAIN PANEL ────────────────────────────────────────────────────────────────

export function LeadsPanel({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // KPIs
  const total = leads.length
  const newLeads = leads.filter((l) => l.stage === 'new').length
  const avgScore = leads.filter((l) => l.leadScore !== null).length > 0
    ? Math.round(leads.filter((l) => l.leadScore !== null).reduce((s, l) => s + (l.leadScore ?? 0), 0) / leads.filter((l) => l.leadScore !== null).length)
    : null
  const closedLeads = leads.filter((l) => l.stage === 'closed').length
  const conversionRate = total > 0 ? Math.round((closedLeads / total) * 100) : 0

  // Unique agents
  const agents = useMemo(() => {
    const found = new Set(leads.map((l) => l.foundBy).filter(Boolean) as string[])
    return Array.from(found).sort()
  }, [leads])

  // Filtered + sorted
  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        if (search) {
          const q = search.toLowerCase()
          return (
            l.clinicName.toLowerCase().includes(q) ||
            (l.contactName?.toLowerCase().includes(q) ?? false) ||
            (l.instagram?.toLowerCase().includes(q) ?? false) ||
            (l.email?.toLowerCase().includes(q) ?? false)
          )
        }
        return true
      })
      .filter((l) => stageFilter === 'all' || l.stage === stageFilter)
      .filter((l) => agentFilter === 'all' || l.foundBy === agentFilter)
      .sort((a, b) => {
        if (sortBy === 'score') return (b.leadScore ?? -1) - (a.leadScore ?? -1)
        if (sortBy === 'name') return a.clinicName.localeCompare(b.clinicName)
        return (b.leadNumber ?? 0) - (a.leadNumber ?? 0)
      })
  }, [leads, search, stageFilter, agentFilter, sortBy])

  const handleStageChange = async (id: string, stage: string) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l))
    }
  }

  const handleLeadUpdated = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))
    setSelectedLead(null)
    setSuccessMsg('✅ Lead actualizado')
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleLeadCreated = (lead: Lead) => {
    setLeads((prev) => [lead, ...prev])
    setSuccessMsg('✅ Lead creado correctamente')
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Leads', value: total, color: 'text-violet-400' },
          { label: 'Nuevos', value: newLeads, color: 'text-blue-400' },
          { label: 'Score Promedio', value: avgScore !== null ? `${avgScore}/100` : '—', color: 'text-yellow-400' },
          { label: 'Tasa de Cierre', value: `${conversionRate}%`, color: 'text-emerald-400' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              <p className={cn('mt-1.5 text-2xl font-bold', kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clínica, contacto, Instagram…"
            className="pl-9"
          />
        </div>

        {/* Stage filter */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Agent filter */}
        {agents.length > 0 && (
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los agentes</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a} value={a}>
                  {AGENT_AVATARS[a] ?? '🤖'} {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Más recientes</SelectItem>
            <SelectItem value="score">Mayor score</SelectItem>
            <SelectItem value="name">A → Z</SelectItem>
          </SelectContent>
        </Select>

        {/* Add button */}
        <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 ml-auto">
          <Plus className="h-4 w-4" />
          Agregar Lead
        </Button>
      </div>

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {total} leads
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No se encontraron leads con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              rowNumber={lead.leadNumber}
              onClick={() => setSelectedLead(lead)}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      {selectedLead && (
        <LeadDetailDialog
          lead={leads.find((l) => l.id === selectedLead.id) ?? selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
        />
      )}

      {/* Add dialog */}
      <AddLeadDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onCreated={handleLeadCreated}
      />
    </div>
  )
}
