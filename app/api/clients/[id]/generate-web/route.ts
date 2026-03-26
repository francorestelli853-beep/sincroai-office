export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/generate-web
 *
 * Genera el HTML del sitio web del cliente reemplazando todas las variables
 * {{VAR}} del template templates/clinic-website.html con los datos reales.
 *
 * PRE-REQUISITO SUPABASE — correr una sola vez en el SQL Editor:
 *   ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_config JSONB DEFAULT '{}';
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

interface WebConfigTestimonial { text: string; name: string; initial: string; service: string }
interface WebConfig {
  tagline?: string; badge?: string
  primaryColor?: string; accentColor?: string
  googleReviewsUrl?: string
  hoursWeekday?: string; hoursSaturday?: string
  testimonials?: WebConfigTestimonial[]
}

function darkenHex(hex: string, factor = 0.18): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const darken = (v: number) => Math.max(0, Math.round(v * (1 - factor))).toString(16).padStart(2, '0')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `#${darken(r)}${darken(g)}${darken(b)}`
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // 1. Traer cliente
  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients').select('*').eq('id', id).single()

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const webConfig: WebConfig = (() => {
    try {
      if (client.web_config && typeof client.web_config === 'object') return client.web_config as WebConfig
      if (typeof client.web_config === 'string') return JSON.parse(client.web_config) as WebConfig
    } catch { /* */ }
    return {}
  })()

  // 2. Leer template
  const templatePath = path.join(process.cwd(), 'templates', 'clinic-website.html')
  let html: string
  try {
    html = fs.readFileSync(templatePath, 'utf-8')
  } catch {
    return NextResponse.json({ error: 'Template no encontrado en /templates/clinic-website.html' }, { status: 500 })
  }

  // 3. Reemplazar variables de texto y JS
  const t = (i: number, field: keyof WebConfigTestimonial) =>
    webConfig.testimonials?.[i]?.[field] ?? ''

  const replacements: Record<string, string> = {
    '{{CLINIC_NAME}}':         client.clinic_name ?? '',
    '{{CLINIC_TAGLINE}}':      webConfig.tagline ?? '',
    '{{CLINIC_BADGE}}':        webConfig.badge ?? '',
    '{{CLINIC_WHATSAPP}}':     (client.phone ?? '').replace(/\D/g, ''),
    '{{CLINIC_WHATSAPP_DISPLAY}}': client.phone ?? '',
    '{{CLINIC_PHONE}}':        client.phone ?? '',
    '{{CLINIC_PHONE_DISPLAY}}': client.phone ?? '',
    '{{CLINIC_EMAIL}}':        client.email ?? '',
    '{{CLINIC_INSTAGRAM_HANDLE}}': (client.instagram ?? '').replace('@', ''),
    '{{CLINIC_ADDRESS}}':      client.address ?? '',
    '{{HOURS_WEEKDAY}}':       webConfig.hoursWeekday ?? '9:00 — 18:00',
    '{{HOURS_SATURDAY}}':      webConfig.hoursSaturday ?? '9:00 — 13:00',
    '{{GOOGLE_REVIEWS_URL}}':  webConfig.googleReviewsUrl ?? '#',
    '{{SUPABASE_URL}}':        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    '{{SUPABASE_ANON_KEY}}':   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    '{{CLIENT_ID}}':           id,
    '{{N8N_WEBHOOK_URL}}':     '',
    '{{TESTIMONIAL_1_TEXT}}':    t(0, 'text'),
    '{{TESTIMONIAL_1_NAME}}':    t(0, 'name'),
    '{{TESTIMONIAL_1_INITIAL}}': t(0, 'initial'),
    '{{TESTIMONIAL_1_SERVICE}}': t(0, 'service'),
    '{{TESTIMONIAL_2_TEXT}}':    t(1, 'text'),
    '{{TESTIMONIAL_2_NAME}}':    t(1, 'name'),
    '{{TESTIMONIAL_2_INITIAL}}': t(1, 'initial'),
    '{{TESTIMONIAL_2_SERVICE}}': t(1, 'service'),
    '{{TESTIMONIAL_3_TEXT}}':    t(2, 'text'),
    '{{TESTIMONIAL_3_NAME}}':    t(2, 'name'),
    '{{TESTIMONIAL_3_INITIAL}}': t(2, 'initial'),
    '{{TESTIMONIAL_3_SERVICE}}': t(2, 'service'),
  }

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value)
  }

  // 4. Reemplazar colores CSS (los valores hex en las variables)
  const primary   = webConfig.primaryColor  ?? '#C4A07A'
  const accent    = webConfig.accentColor   ?? '#6B4E32'
  const primaryDk = darkenHex(primary)

  html = html.replace(/(--primary:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primary}$2`)
  html = html.replace(/(--primary-dark:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryDk}$2`)
  html = html.replace(/(--accent:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${accent}$2`)

  // 5. Devolver como archivo descargable
  const slug = (client.clinic_name ?? 'clinica')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-web.html"`,
    },
  })
}
