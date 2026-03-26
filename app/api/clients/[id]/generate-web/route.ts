export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/generate-web
 *
 * Genera el HTML del sitio web del cliente reemplazando todas las variables
 * {{VAR}} del template con los datos reales desde Supabase.
 *
 * PRE-REQUISITOS SUPABASE (correr una sola vez en el SQL Editor):
 *   ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_config JSONB DEFAULT '{}';
 *   ALTER TABLE clients ADD COLUMN IF NOT EXISTS generated_web_html TEXT;
 *
 *   CREATE TABLE IF NOT EXISTS client_services (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
 *     name text NOT NULL, description text,
 *     duration_minutes int, price numeric, currency text DEFAULT 'ARS',
 *     active boolean DEFAULT true
 *   );
 *
 *   CREATE TABLE IF NOT EXISTS client_schedule (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
 *     day_of_week int NOT NULL,
 *     open_time time NOT NULL DEFAULT '09:00',
 *     close_time time NOT NULL DEFAULT '18:00',
 *     slot_duration_minutes int DEFAULT 60,
 *     active boolean DEFAULT false,
 *     UNIQUE(client_id, day_of_week)
 *   );
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { clinicTemplate } from '@/lib/clinic-template'

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string; client_id: string; name: string; active: boolean
  description?: string; duration_minutes?: number; price?: number; currency?: string
}

interface ScheduleRow {
  id?: string; client_id: string; day_of_week: number
  open_time: string; close_time: string; slot_duration_minutes?: number; active: boolean
}

interface WebConfig {
  tagline?: string
  badge?: string
  // camelCase (guardado desde el panel Next.js)
  primaryColor?: string
  accentColor?: string
  googleReviewsUrl?: string
  hoursWeekday?: string
  hoursSaturday?: string
  // snake_case (alternativa desde n8n / SQL directo)
  primary_color?: string
  accent_color?: string
  google_reviews_url?: string
  hours_weekday?: string
  hours_saturday?: string
  // Testimonios como array (formato legacy)
  testimonials?: Array<{ text: string; name: string; initial: string; service: string }>
  // Testimonios como campos planos (formato nuevo)
  testimonial_1_text?: string; testimonial_1_name?: string; testimonial_1_service?: string
  testimonial_2_text?: string; testimonial_2_name?: string; testimonial_2_service?: string
  testimonial_3_text?: string; testimonial_3_name?: string; testimonial_3_service?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function darkenHex(hex: string, factor = 0.18): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const darken = (v: number) => Math.max(0, Math.round(v * (1 - factor))).toString(16).padStart(2, '0')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `#${darken(r)}${darken(g)}${darken(b)}`
}

function parseWebConfig(raw: unknown): WebConfig {
  try {
    if (raw && typeof raw === 'object') return raw as WebConfig
    if (typeof raw === 'string') return JSON.parse(raw) as WebConfig
  } catch { /* */ }
  return {}
}

function cfgStr(wc: WebConfig, camel: keyof WebConfig, snake: keyof WebConfig): string {
  return (wc[camel] as string | undefined) ?? (wc[snake] as string | undefined) ?? ''
}

/** Testimonial getter: soporta array legacy y campos planos */
function testimonial(wc: WebConfig, idx: 0 | 1 | 2, field: 'text' | 'name' | 'service'): string {
  // campos planos tienen prioridad
  const key = `testimonial_${idx + 1}_${field}` as keyof WebConfig
  if (wc[key]) return wc[key] as string
  // legacy array
  return wc.testimonials?.[idx]?.[field] ?? ''
}

function testimonialInitial(wc: WebConfig, idx: 0 | 1 | 2): string {
  const legacyInitial = wc.testimonials?.[idx]?.initial
  if (legacyInitial) return legacyInitial
  const name = testimonial(wc, idx, 'name')
  return name ? name.charAt(0).toUpperCase() : ''
}

// ── Default testimonials ─────────────────────────────────────────────────────

const DEFAULT_TESTIMONIALS = [
  { text: 'Excelente atención y resultados increíbles.', name: 'Valentina R.', service: 'Tratamiento facial' },
  { text: 'Profesionalismo y calidez en cada visita.', name: 'Lucía M.', service: 'Depilación láser' },
  { text: 'Superó todas mis expectativas. Lo recomiendo.', name: 'Sofía P.', service: 'Limpieza profunda' },
]

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // 1. Fetch en paralelo: cliente + servicios activos + horarios
  const [clientRes, servicesRes, scheduleRes] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', id).single(),
    supabaseAdmin.from('client_services').select('*').eq('client_id', id).eq('active', true).order('name'),
    supabaseAdmin.from('client_schedule').select('*').eq('client_id', id).order('day_of_week'),
  ])

  if (clientRes.error || !clientRes.data) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const client   = clientRes.data
  const services = (servicesRes.data ?? []) as ServiceRow[]
  const schedule = (scheduleRes.data ?? []) as ScheduleRow[]

  const wc = parseWebConfig(client.web_config)

  // 2. Resolver colores
  const primaryColor = cfgStr(wc, 'primaryColor', 'primary_color') || '#8c7161'
  const accentColor  = cfgStr(wc, 'accentColor',  'accent_color')  || '#c9a96e'
  const primaryDark  = darkenHex(primaryColor)

  // 3. Resolver testimonios (con defaults si están vacíos)
  const tText = (i: 0 | 1 | 2) => testimonial(wc, i, 'text')    || DEFAULT_TESTIMONIALS[i].text
  const tName = (i: 0 | 1 | 2) => testimonial(wc, i, 'name')    || DEFAULT_TESTIMONIALS[i].name
  const tSvc  = (i: 0 | 1 | 2) => testimonial(wc, i, 'service') || DEFAULT_TESTIMONIALS[i].service
  const tInit = (i: 0 | 1 | 2) => testimonialInitial(wc, i)      || DEFAULT_TESTIMONIALS[i].name.charAt(0)

  // 4. Resolver horarios desde client_schedule si existen
  const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  let hoursWeekday  = cfgStr(wc, 'hoursWeekday', 'hours_weekday')  || '9:00 — 19:00'
  let hoursSaturday = cfgStr(wc, 'hoursSaturday', 'hours_saturday') || '9:00 — 14:00'

  if (schedule.length > 0) {
    const weekdays = schedule.filter((r) => r.active && r.day_of_week >= 1 && r.day_of_week <= 5)
    const sat      = schedule.find((r) => r.active && r.day_of_week === 6)
    if (weekdays.length > 0) {
      const first = weekdays[0]
      const last  = weekdays[weekdays.length - 1]
      const open  = (first.open_time  ?? '09:00').slice(0, 5)
      const close = (last.close_time  ?? '18:00').slice(0, 5)
      hoursWeekday = `${open} — ${close}`
    }
    if (sat) {
      const open  = (sat.open_time  ?? '09:00').slice(0, 5)
      const close = (sat.close_time ?? '14:00').slice(0, 5)
      hoursSaturday = `${open} — ${close}`
    }
  }

  // 5. Construir mapa de reemplazos de texto ──────────────────────────────────
  const phone       = client.phone ?? ''
  const phoneDigits = phone.replace(/\D/g, '')

  const replacements: Record<string, string> = {
    '{{CLINIC_NAME}}':              client.clinic_name ?? '',
    '{{CLINIC_TAGLINE}}':           cfgStr(wc, 'tagline', 'tagline')    || 'Centro de estética',
    '{{CLINIC_BADGE}}':             cfgStr(wc, 'badge',   'badge')       || 'Profesionales de confianza',
    '{{CLINIC_WHATSAPP}}':          phoneDigits,
    '{{CLINIC_WHATSAPP_DISPLAY}}':  phone,
    '{{CLINIC_PHONE}}':             phone,
    '{{CLINIC_PHONE_DISPLAY}}':     phone,
    '{{CLINIC_EMAIL}}':             client.email    ?? '',
    '{{CLINIC_INSTAGRAM_HANDLE}}':  (client.instagram ?? '').replace(/^@/, ''),
    '{{CLINIC_ADDRESS}}':           client.address  ?? '',
    '{{HOURS_WEEKDAY}}':            hoursWeekday,
    '{{HOURS_SATURDAY}}':           hoursSaturday,
    '{{GOOGLE_REVIEWS_URL}}':       cfgStr(wc, 'googleReviewsUrl', 'google_reviews_url') || '#',
    '{{SUPABASE_URL}}':             process.env.NEXT_PUBLIC_SUPABASE_URL    ?? '',
    '{{SUPABASE_ANON_KEY}}':        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    '{{CLIENT_ID}}':                id,
    '{{N8N_WEBHOOK_URL}}':          'http://172.18.0.3:5678/webhook/clinic-events',
    // Colores como texto (reemplaza los comentarios y cualquier uso textual)
    '{{PRIMARY_COLOR}}':            primaryColor,
    '{{PRIMARY_DARK}}':             primaryDark,
    '{{ACCENT_COLOR}}':             accentColor,
    // Testimonios
    '{{TESTIMONIAL_1_TEXT}}':       tText(0),
    '{{TESTIMONIAL_1_NAME}}':       tName(0),
    '{{TESTIMONIAL_1_INITIAL}}':    tInit(0),
    '{{TESTIMONIAL_1_SERVICE}}':    tSvc(0),
    '{{TESTIMONIAL_2_TEXT}}':       tText(1),
    '{{TESTIMONIAL_2_NAME}}':       tName(1),
    '{{TESTIMONIAL_2_INITIAL}}':    tInit(1),
    '{{TESTIMONIAL_2_SERVICE}}':    tSvc(1),
    '{{TESTIMONIAL_3_TEXT}}':       tText(2),
    '{{TESTIMONIAL_3_NAME}}':       tName(2),
    '{{TESTIMONIAL_3_INITIAL}}':    tInit(2),
    '{{TESTIMONIAL_3_SERVICE}}':    tSvc(2),
  }

  // 6. Aplicar reemplazos de texto ───────────────────────────────────────────
  let html = clinicTemplate
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value)
  }

  // 7. Reemplazar valores hex en las variables CSS (lo que realmente cambia los colores)
  html = html.replace(/(--primary:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryColor}$2`)
  html = html.replace(/(--primary-dark:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryDark}$2`)
  html = html.replace(/(--accent:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${accentColor}$2`)

  // 8. Guardar HTML generado en clients.generated_web_html (fire-and-forget)
  supabaseAdmin
    .from('clients')
    .update({ generated_web_html: html })
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.error('[generate-web] Error guardando generated_web_html:', error.message)
    })

  // 9. Registrar en activity_log (fire-and-forget)
  supabaseAdmin
    .from('activity_log')
    .insert({
      agent_id:    'vera',
      action:      `Web generada: ${client.clinic_name ?? id}`,
      category:    'task',
      metadata:    JSON.stringify({
        client_id:   id,
        clinic_name: client.clinic_name,
        services:    services.length,
        schedule:    schedule.filter((r) => r.active).length,
      }),
    })
    .then(({ error }) => {
      if (error) console.error('[generate-web] Error en activity_log:', error.message)
    })

  // 10. Devolver HTML como archivo descargable
  const slug = (client.clinic_name ?? 'clinica')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return new NextResponse(html, {
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="web-${slug}.html"`,
    },
  })
}
