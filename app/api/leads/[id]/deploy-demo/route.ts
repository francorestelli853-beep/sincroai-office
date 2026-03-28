export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/[id]/deploy-demo
 *
 * Genera el HTML del sitio demo a partir del clinicTemplate y lo despliega
 * automáticamente en Netlify via Files API (sin zip).
 * Guarda la URL resultante en leads.demo_url.
 *
 * Requiere env: NETLIFY_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { clinicTemplate } from '@/lib/clinic-template'

// ── Helpers ───────────────────────────────────────────────────────────────────

function darkenHex(hex: string, factor = 0.18): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const darken = (v: number) => Math.max(0, Math.round(v * (1 - factor))).toString(16).padStart(2, '0')
  return `#${darken(parseInt(h.slice(0, 2), 16))}${darken(parseInt(h.slice(2, 4), 16))}${darken(parseInt(h.slice(4, 6), 16))}`
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30)
}

function buildDemoHtml(params: {
  clinicName: string
  phone: string
  email: string
  instagram: string
  address: string
}): string {
  const { clinicName, phone, email, instagram, address } = params
  const phoneDigits = phone.replace(/\D/g, '')
  const primaryColor = '#8c7161'
  const accentColor  = '#c9a96e'
  const primaryDark  = darkenHex(primaryColor)

  const replacements: Record<string, string> = {
    '{{CLINIC_NAME}}':              clinicName,
    '{{CLINIC_TAGLINE}}':           'Centro de estética',
    '{{CLINIC_BADGE}}':             'Profesionales de confianza',
    '{{CLINIC_WHATSAPP}}':          phoneDigits,
    '{{CLINIC_WHATSAPP_DISPLAY}}':  phone,
    '{{CLINIC_PHONE}}':             phone,
    '{{CLINIC_PHONE_DISPLAY}}':     phone,
    '{{CLINIC_EMAIL}}':             email,
    '{{CLINIC_INSTAGRAM_HANDLE}}':  instagram.replace(/^@/, ''),
    '{{CLINIC_ADDRESS}}':           address,
    '{{HOURS_WEEKDAY}}':            '9:00 — 19:00',
    '{{HOURS_SATURDAY}}':           '9:00 — 14:00',
    '{{GOOGLE_REVIEWS_URL}}':       '#',
    '{{SUPABASE_URL}}':             process.env.NEXT_PUBLIC_SUPABASE_URL    ?? '',
    '{{SUPABASE_ANON_KEY}}':        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    '{{CLIENT_ID}}':                '',
    '{{N8N_WEBHOOK_URL}}':          '',
    '{{PRIMARY_COLOR}}':            primaryColor,
    '{{PRIMARY_DARK}}':             primaryDark,
    '{{ACCENT_COLOR}}':             accentColor,
    '{{TESTIMONIAL_1_TEXT}}':       'Excelente atención y resultados increíbles.',
    '{{TESTIMONIAL_1_NAME}}':       'Valentina R.',
    '{{TESTIMONIAL_1_INITIAL}}':    'V',
    '{{TESTIMONIAL_1_SERVICE}}':    'Tratamiento facial',
    '{{TESTIMONIAL_2_TEXT}}':       'Profesionalismo y calidez en cada visita.',
    '{{TESTIMONIAL_2_NAME}}':       'Lucía M.',
    '{{TESTIMONIAL_2_INITIAL}}':    'L',
    '{{TESTIMONIAL_2_SERVICE}}':    'Depilación láser',
    '{{TESTIMONIAL_3_TEXT}}':       'Superó todas mis expectativas. Lo recomiendo.',
    '{{TESTIMONIAL_3_NAME}}':       'Sofía P.',
    '{{TESTIMONIAL_3_INITIAL}}':    'S',
    '{{TESTIMONIAL_3_SERVICE}}':    'Limpieza profunda',
  }

  let html = clinicTemplate
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value)
  }

  // Reemplazar colores CSS
  html = html.replace(/(--primary:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryColor}$2`)
  html = html.replace(/(--primary-dark:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryDark}$2`)
  html = html.replace(/(--accent:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${accentColor}$2`)

  return html
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN
  if (!NETLIFY_TOKEN) {
    return NextResponse.json({ error: 'NETLIFY_TOKEN no configurado' }, { status: 500 })
  }

  // 1. Obtener lead — primero intenta Supabase, fallback al body del request
  let clinicName = '', phone = '', email = '', instagram = '', address = ''

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('clinic_name, phone, email, instagram, address')
    .eq('id', id)
    .single()

  if (lead) {
    clinicName = lead.clinic_name ?? ''
    phone      = lead.phone      ?? ''
    email      = lead.email      ?? ''
    instagram  = lead.instagram  ?? ''
    address    = lead.address    ?? ''
  } else {
    // fallback: usar datos enviados en el body
    try {
      const body = await req.json()
      clinicName = body.clinic_name  ?? ''
      phone      = body.phone        ?? ''
      email      = body.email        ?? ''
      instagram  = body.instagram    ?? ''
      address    = body.address      ?? ''
    } catch { /* ignore */ }
  }

  if (!clinicName) {
    return NextResponse.json({ error: 'clinic_name es requerido' }, { status: 400 })
  }

  // 2. Generar HTML
  const html = buildDemoHtml({ clinicName, phone, email, instagram, address })

  // 3. SHA1 del archivo
  const sha1 = createHash('sha1').update(Buffer.from(html, 'utf8')).digest('hex')

  const netlifyAuth = { Authorization: `Bearer ${NETLIFY_TOKEN}` }

  // 4. Crear sitio en Netlify
  const siteName = `sincroai-${slugify(clinicName)}-${Date.now()}`

  const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: { ...netlifyAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: siteName }),
  })

  if (!siteRes.ok) {
    const errText = await siteRes.text()
    console.error('[deploy-demo] Error creando sitio Netlify:', errText)
    return NextResponse.json({ error: `Netlify: error al crear sitio (${siteRes.status})` }, { status: 500 })
  }

  const siteData = await siteRes.json()
  const siteId  = siteData.id  as string
  const siteUrl = (siteData.ssl_url || siteData.url) as string

  console.log('[deploy-demo] Sitio creado:', siteId, siteUrl)

  // 5. Crear deploy con digest del archivo
  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: { ...netlifyAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { '/index.html': sha1 } }),
  })

  if (!deployRes.ok) {
    const errText = await deployRes.text()
    console.error('[deploy-demo] Error creando deploy:', errText)
    return NextResponse.json({ error: `Netlify: error al crear deploy (${deployRes.status})` }, { status: 500 })
  }

  const deployData = await deployRes.json()
  const deployId   = deployData.id as string

  console.log('[deploy-demo] Deploy creado:', deployId, '| required:', deployData.required)

  // 6. Subir el archivo HTML
  const uploadRes = await fetch(
    `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
    {
      method: 'PUT',
      headers: { ...netlifyAuth, 'Content-Type': 'application/octet-stream' },
      body: Buffer.from(html, 'utf8'),
    }
  )

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    console.error('[deploy-demo] Error subiendo archivo:', errText)
    return NextResponse.json({ error: `Netlify: error al subir index.html (${uploadRes.status})` }, { status: 500 })
  }

  console.log('[deploy-demo] Archivo subido OK → URL:', siteUrl)

  // 7. Guardar demo_url en leads (fire-and-forget)
  supabaseAdmin
    .from('leads')
    .update({ demo_url: siteUrl, stage: 'proposal_sent' })
    .eq('id', id)
    .then(({ error: e }) => {
      if (e) console.warn('[deploy-demo] Error actualizando leads.demo_url:', e.message)
      else   console.log('[deploy-demo] leads.demo_url actualizada:', siteUrl)
    })

  // 8. Activity log (fire-and-forget)
  supabaseAdmin.from('activity_log').insert({
    agent_id:   'vera',
    agent_name: 'Vera',
    action:     `Demo web desplegada: ${clinicName}`,
    details:    `Netlify deploy → ${siteUrl}`,
    category:   'task',
    timestamp:  new Date().toISOString(),
  }).then(({ error: e }) => {
    if (e) console.warn('[deploy-demo] Error en activity_log:', e.message)
  })

  return NextResponse.json({ url: siteUrl })
}
