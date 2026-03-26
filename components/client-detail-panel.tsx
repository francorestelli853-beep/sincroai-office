'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Download, Loader2, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Client, ClientService, ClientSchedule, WebConfig } from '@/lib/supabase'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type ServiceRow = Omit<ClientService, 'clientId'> & { _isNew?: boolean }

type ScheduleRow = {
  id: string | null
  dayOfWeek: number
  label: string
  openTime: string
  closeTime: string
  slotDurationMinutes: number
  active: boolean
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const EMPTY_TESTIMONIAL = { text: '', name: '', initial: '', service: '' }

const DEFAULT_WEB_CONFIG: WebConfig = {
  tagline: '', badge: '',
  primaryColor: '#8c7161', accentColor: '#c9a96e',
  googleReviewsUrl: '',
  hoursWeekday: '9:00 — 19:00', hoursSaturday: '9:00 — 14:00',
  testimonials: [
    { ...EMPTY_TESTIMONIAL },
    { ...EMPTY_TESTIMONIAL },
    { ...EMPTY_TESTIMONIAL },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildScheduleRows(loaded: ClientSchedule[]): ScheduleRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const found = loaded.find((r) => r.dayOfWeek === dow)
    return {
      id:                  found?.id ?? null,
      dayOfWeek:           dow,
      label:               DAYS[dow],
      openTime:            found?.openTime ?? '09:00',
      closeTime:           found?.closeTime ?? '18:00',
      slotDurationMinutes: found?.slotDurationMinutes ?? 60,
      active:              found?.active ?? false,
    }
  })
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium',
      type === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    )}>
      {type === 'ok' ? <Check className="h-3 w-3" /> : '!'}
      {msg}
    </span>
  )
}

// ─── Sección 1: Servicios ─────────────────────────────────────────────────────

function ServicesSection({ clientId, initial }: { clientId: string; initial: ClientService[] }) {
  const [rows, setRows] = useState<ServiceRow[]>(initial)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const addRow = () => {
    setRows(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: '', description: null,
      durationMinutes: 60, price: null, currency: 'ARS', active: true,
      _isNew: true,
    }])
  }

  const updateRow = (idx: number, field: string, value: unknown) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const deleteRow = async (idx: number) => {
    const row = rows[idx]
    if (!row._isNew) {
      try {
        await fetch(`/api/client-services/${row.id}`, { method: 'DELETE' })
      } catch { /* ignore */ }
    }
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await Promise.all(rows.map(async (row) => {
        const body = {
          client_id:        clientId,
          name:             row.name,
          description:      row.description,
          duration_minutes: row.durationMinutes,
          price:            row.price,
          currency:         row.currency,
          active:           row.active,
        }
        if (row._isNew) {
          const res = await fetch('/api/client-services', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const { service } = await res.json() as { service: { id: string } }
            // update row id
            setRows(prev => prev.map(r =>
              r.id === row.id ? { ...r, id: service.id, _isNew: false } : r
            ))
          }
        } else {
          await fetch(`/api/client-services/${row.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        }
      }))
      setStatus({ msg: 'Guardado', type: 'ok' })
    } catch {
      setStatus({ msg: 'Error al guardar', type: 'err' })
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Servicios</h2>
          <p className="mt-0.5 text-sm text-gray-500">Tratamientos que se muestran en la web del cliente</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <Toast msg={status.msg} type={status.type} />}
          <button onClick={addRow} className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            <Plus className="h-3.5 w-3.5" />Agregar
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-800 py-10 text-center">
          <p className="text-sm text-gray-600">Sin servicios. Hacé click en &quot;Agregar&quot; para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[2fr_2fr_80px_100px_72px_36px] gap-3 px-2 mb-2">
            {['Nombre', 'Descripción', 'Minutos', 'Precio', 'Moneda', ''].map((h, i) => (
              <p key={i} className="text-[10px] font-medium uppercase tracking-wider text-gray-600">{h}</p>
            ))}
          </div>
          {rows.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_80px_100px_72px_36px] gap-3 items-center border-t border-gray-800/60 py-3 px-2">
              <input
                value={row.name}
                onChange={e => updateRow(idx, 'name', e.target.value)}
                placeholder="Nombre del servicio"
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
              />
              <input
                value={row.description ?? ''}
                onChange={e => updateRow(idx, 'description', e.target.value || null)}
                placeholder="Descripción (opcional)"
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
              />
              <input
                type="number" min={1}
                value={row.durationMinutes ?? ''}
                onChange={e => updateRow(idx, 'durationMinutes', e.target.value ? Number(e.target.value) : null)}
                placeholder="60"
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
              />
              <input
                type="number" min={0}
                value={row.price ?? ''}
                onChange={e => updateRow(idx, 'price', e.target.value ? Number(e.target.value) : null)}
                placeholder="0"
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
              />
              <select
                value={row.currency}
                onChange={e => updateRow(idx, 'currency', e.target.value)}
                className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <button onClick={() => deleteRow(idx)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-red-500/15 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sección 2: Horarios ──────────────────────────────────────────────────────

function ScheduleSection({ clientId, initial }: { clientId: string; initial: ClientSchedule[] }) {
  const [rows, setRows] = useState<ScheduleRow[]>(buildScheduleRows(initial))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const updateRow = (idx: number, field: string, value: unknown) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/client-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          rows: rows.map(r => ({
            day_of_week:           r.dayOfWeek,
            open_time:             r.openTime,
            close_time:            r.closeTime,
            slot_duration_minutes: r.slotDurationMinutes,
            active:                r.active,
          })),
        }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error?: string }
        throw new Error(error ?? 'Error al guardar')
      }
      setStatus({ msg: 'Guardado', type: 'ok' })
    } catch (err) {
      setStatus({ msg: (err as Error).message, type: 'err' })
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Horarios de atención</h2>
          <p className="mt-0.5 text-sm text-gray-500">Define cuándo está disponible el sistema de turnos online</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <Toast msg={status.msg} type={status.type} />}
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar horarios
          </button>
        </div>
      </div>

      <div className="space-y-0">
        <div className="hidden sm:grid grid-cols-[100px_1fr_120px_120px_90px] gap-4 px-3 mb-2">
          {['Día', '', 'Apertura', 'Cierre', 'Slot (min)'].map((h, i) => (
            <p key={i} className="text-[10px] font-medium uppercase tracking-wider text-gray-600">{h}</p>
          ))}
        </div>
        {rows.map((row, idx) => (
          <div key={row.dayOfWeek} className={cn(
            'grid grid-cols-1 sm:grid-cols-[100px_1fr_120px_120px_90px] gap-4 items-center py-3 px-3 rounded-lg transition-colors',
            row.active ? 'bg-gray-800/30' : 'opacity-50'
          )}>
            <p className="text-sm font-medium text-gray-300">{row.label}</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => updateRow(idx, 'active', !row.active)}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
                  row.active ? 'bg-violet-600' : 'bg-gray-700'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                  row.active ? 'translate-x-4' : 'translate-x-0'
                )} />
              </div>
              <span className="text-xs text-gray-500">{row.active ? 'Activo' : 'Cerrado'}</span>
            </label>
            <input
              type="time"
              value={row.openTime}
              onChange={e => updateRow(idx, 'openTime', e.target.value)}
              disabled={!row.active}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none disabled:opacity-40"
            />
            <input
              type="time"
              value={row.closeTime}
              onChange={e => updateRow(idx, 'closeTime', e.target.value)}
              disabled={!row.active}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none disabled:opacity-40"
            />
            <input
              type="number" min={15} step={15}
              value={row.slotDurationMinutes}
              onChange={e => updateRow(idx, 'slotDurationMinutes', Number(e.target.value) || 60)}
              disabled={!row.active}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none disabled:opacity-40"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sección 3: Configuración Web ─────────────────────────────────────────────

function WebConfigSection({ clientId, initial }: { clientId: string; initial: WebConfig | null }) {
  const init: WebConfig = initial ?? DEFAULT_WEB_CONFIG
  // Ensure exactly 3 testimonials
  const ensureTestimonials = (cfg: WebConfig): WebConfig => ({
    ...cfg,
    testimonials: [
      cfg.testimonials?.[0] ?? { ...EMPTY_TESTIMONIAL },
      cfg.testimonials?.[1] ?? { ...EMPTY_TESTIMONIAL },
      cfg.testimonials?.[2] ?? { ...EMPTY_TESTIMONIAL },
    ] as [typeof EMPTY_TESTIMONIAL, typeof EMPTY_TESTIMONIAL, typeof EMPTY_TESTIMONIAL],
  })

  const [form, setForm] = useState<WebConfig>(ensureTestimonials(init))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const set = (field: keyof WebConfig, value: unknown) => setForm(p => ({ ...p, [field]: value }))

  const setTestimonial = (idx: number, field: string, value: string) => {
    const ts = [...form.testimonials] as typeof form.testimonials
    ts[idx] = { ...ts[idx], [field]: value }
    setForm(p => ({ ...p, testimonials: ts }))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ web_config: form }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error?: string }
        throw new Error(error ?? 'Error al guardar')
      }
      setStatus({ msg: 'Guardado', type: 'ok' })
    } catch (err) {
      setStatus({ msg: (err as Error).message, type: 'err' })
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  const fieldCls = "w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Datos para la web</h2>
          <p className="mt-0.5 text-sm text-gray-500">Texto, colores y testimonios que se usan al generar el sitio</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <Toast msg={status.msg} type={status.type} />}
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </button>
        </div>
      </div>

      {/* Textos principales */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Textos</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Tagline</label>
            <input value={form.tagline} onChange={e => set('tagline', e.target.value)}
              placeholder="Centro de estética avanzada" className={fieldCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Badge del hero</label>
            <input value={form.badge} onChange={e => set('badge', e.target.value)}
              placeholder="Más de 10 años de experiencia" className={fieldCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Horario lunes–viernes</label>
            <input value={form.hoursWeekday} onChange={e => set('hoursWeekday', e.target.value)}
              placeholder="9:00 — 19:00" className={fieldCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Horario sábados</label>
            <input value={form.hoursSaturday} onChange={e => set('hoursSaturday', e.target.value)}
              placeholder="9:00 — 14:00" className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-gray-400">URL de Google Reviews</label>
            <input value={form.googleReviewsUrl} onChange={e => set('googleReviewsUrl', e.target.value)}
              placeholder="https://g.page/r/..." className={fieldCls} />
          </div>
        </div>
      </div>

      {/* Colores */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Colores</p>
        <div className="flex gap-6 flex-wrap">
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Color primario</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primaryColor}
                onChange={e => set('primaryColor', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-gray-700 bg-gray-800 p-0.5" />
              <input value={form.primaryColor}
                onChange={e => set('primaryColor', e.target.value)}
                className="w-28 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Color acento</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accentColor}
                onChange={e => set('accentColor', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-gray-700 bg-gray-800 p-0.5" />
              <input value={form.accentColor}
                onChange={e => set('accentColor', e.target.value)}
                className="w-28 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonios */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Testimonios</p>
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-lg border border-gray-800 p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500">Testimonio {i + 1}</p>
              <textarea
                value={form.testimonials[i].text}
                onChange={e => setTestimonial(i, 'text', e.target.value)}
                placeholder="El tratamiento superó todas mis expectativas..."
                rows={2}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none resize-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-gray-500">Nombre</label>
                  <input value={form.testimonials[i].name}
                    onChange={e => setTestimonial(i, 'name', e.target.value)}
                    placeholder="María G." className={fieldCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-gray-500">Inicial (avatar)</label>
                  <input value={form.testimonials[i].initial}
                    onChange={e => setTestimonial(i, 'initial', e.target.value.slice(0, 1))}
                    placeholder="M" maxLength={1} className={fieldCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-gray-500">Servicio</label>
                  <input value={form.testimonials[i].service}
                    onChange={e => setTestimonial(i, 'service', e.target.value)}
                    placeholder="Dermoabrasión" className={fieldCls} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sección 4: Generar Web ───────────────────────────────────────────────────

function GenerateWebSection({ clientId, clinicName }: { clientId: string; clinicName: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setDownloadUrl(null)

    try {
      const res = await fetch(`/api/clients/${clientId}/generate-web`, { method: 'POST' })
      if (!res.ok) {
        const { error: msg } = await res.json() as { error?: string }
        throw new Error(msg ?? 'Error al generar')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      setDownloadUrl(url)
      setFileName(match?.[1] ?? 'clinica-web.html')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const triggerDownload = () => {
    if (!downloadUrl || !fileName) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Generar web</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Genera el archivo HTML del sitio de <span className="text-gray-300">{clinicName}</span> listo para deployar en Netlify
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-800/30 py-12 px-8 text-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <Download className="h-6 w-6" />
        </div>

        <div>
          <p className="font-medium text-white">Sitio web personalizado</p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Un solo archivo HTML con todos los datos del cliente, servicios, colores y configuración. Arrastrá el archivo a Netlify para publicar en segundos.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>
        )}

        {downloadUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4" /> HTML generado correctamente
            </div>
            <button
              onClick={triggerDownload}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar {fileName}
            </button>
            <button onClick={() => { setDownloadUrl(null); setFileName(null) }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Generar nuevamente
            </button>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-8 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generando…</>
            ) : (
              <><Download className="h-4 w-4" />Generar Web del Cliente</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function ClientDetailPanel({
  client,
  initialServices,
  initialSchedule,
}: {
  client: Client
  initialServices: ClientService[]
  initialSchedule: ClientSchedule[]
}) {
  return (
    <div className="space-y-6">
      {/* Back + título */}
      <div className="flex items-center gap-4">
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>
        <span className="text-gray-700">/</span>
        <p className="text-sm text-gray-300 font-medium">{client.clinicName}</p>
      </div>

      <ServicesSection  clientId={client.id} initial={initialServices} />
      <ScheduleSection  clientId={client.id} initial={initialSchedule} />
      <WebConfigSection clientId={client.id} initial={client.webConfig} />
      <GenerateWebSection clientId={client.id} clinicName={client.clinicName} />
    </div>
  )
}
