export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/process-leads
 *
 * Vercel Cron — se ejecuta a las 9am Argentina (12:00 UTC) todos los días.
 * Para cada lead con email y sin demo enviada:
 *   1. Despliega web demo en Netlify
 *   2. Envía email con el link via Resend
 *   3. Actualiza stage → demo_sent en Supabase
 *
 * Máximo 5 leads por ejecución para respetar timeouts de Vercel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash }                from 'crypto'
import { Resend }                    from 'resend'
import { supabaseAdmin }             from '@/lib/supabase'
import { clinicTemplate }            from '@/lib/clinic-template'

// ── Helpers (copiados de deploy-demo y send-demo para evitar HTTP a sí mismo) ──

function darkenHex(hex: string, factor = 0.18): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const d = (v: number) => Math.max(0, Math.round(v * (1 - factor))).toString(16).padStart(2, '0')
  return `#${d(parseInt(h.slice(0,2),16))}${d(parseInt(h.slice(2,4),16))}${d(parseInt(h.slice(4,6),16))}`
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
  clinicName: string; phone: string; email: string; instagram: string; address: string
}): string {
  const { clinicName, phone, email, instagram, address } = params
  const phoneDigits  = phone.replace(/\D/g, '')
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
  html = html.replace(/(--primary:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryColor}$2`)
  html = html.replace(/(--primary-dark:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${primaryDark}$2`)
  html = html.replace(/(--accent:\s+)#[0-9A-Fa-f]{6}(;)/, `$1${accentColor}$2`)
  return html
}

async function deployToNetlify(clinicName: string, html: string, token: string): Promise<string> {
  const sha1     = createHash('sha1').update(Buffer.from(html, 'utf8')).digest('hex')
  const auth     = { Authorization: `Bearer ${token}` }
  const siteName = `sincroai-${slugify(clinicName)}-${Date.now()}`

  const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
    method:  'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name: siteName }),
  })
  if (!siteRes.ok) throw new Error(`Netlify crear sitio: ${siteRes.status}`)

  const siteData = await siteRes.json()
  const siteId   = siteData.id  as string
  const siteUrl  = (siteData.ssl_url || siteData.url) as string

  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method:  'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ files: { '/index.html': sha1 } }),
  })
  if (!deployRes.ok) throw new Error(`Netlify deploy: ${deployRes.status}`)

  const { id: deployId } = await deployRes.json()

  const uploadRes = await fetch(
    `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
    {
      method:  'PUT',
      headers: { ...auth, 'Content-Type': 'application/octet-stream' },
      body:    Buffer.from(html, 'utf8'),
    }
  )
  if (!uploadRes.ok) throw new Error(`Netlify upload: ${uploadRes.status}`)

  return siteUrl
}

function buildEmailHtml(params: {
  firstName: string; safeClinic: string; demoUrl: string
}): string {
  const { firstName, safeClinic, demoUrl } = params
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/á/g,'&aacute;').replace(/Á/g,'&Aacute;')
    .replace(/é/g,'&eacute;').replace(/É/g,'&Eacute;')
    .replace(/í/g,'&iacute;').replace(/Í/g,'&Iacute;')
    .replace(/ó/g,'&oacute;').replace(/Ó/g,'&Oacute;')
    .replace(/ú/g,'&uacute;').replace(/Ú/g,'&Uacute;')
    .replace(/ñ/g,'&ntilde;').replace(/Ñ/g,'&Ntilde;')
  const sf = esc(firstName)
  const sc = safeClinic

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="padding-bottom:32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Sincro<span style="color:#8b5cf6;">AI</span></p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Automatizaci&oacute;n para cl&iacute;nicas est&eacute;ticas</p>
          </td>
        </tr>
        <tr>
          <td style="background:#18181f;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">
            <p style="margin:0 0 20px;font-size:16px;color:#e5e7eb;line-height:1.6;">Hola <strong style="color:#ffffff;">${sf}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;color:#d1d5db;line-height:1.7;">
              Vi <strong style="color:#ffffff;">${sc}</strong> en Instagram
              y me tom&eacute; unos minutos para armar una propuesta de c&oacute;mo podr&iacute;a verse
              su sitio web profesional con sistema de turnos incluido.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:linear-gradient(135deg,#1e1b3a 0%,#12101e 100%);border:1px solid #3b3458;border-radius:12px;padding:24px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:11px;color:#8b5cf6;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Su demo personalizada</p>
                  <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;">${sc} &mdash; sitio web + turnos online</p>
                  <a href="${demoUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Ver demo &rarr;</a>
                  <p style="margin:16px 0 0;font-size:11px;color:#6b7280;word-break:break-all;">${demoUrl}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;">La demo incluye</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${[['🗓️','Sistema de turnos online integrado'],['📱','Dise&ntilde;o mobile-first adaptado a su cl&iacute;nica'],['💬','Chat de WhatsApp y chatbot de consultas'],['⭐','Secci&oacute;n de rese&ntilde;as y galer&iacute;a de servicios']].map(([icon,text])=>`<tr><td style="padding:6px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;font-size:16px;">${icon}</td><td style="font-size:14px;color:#d1d5db;">${text}</td></tr></table></td></tr>`).join('')}
            </table>
            <p style="margin:0 0 28px;font-size:15px;color:#d1d5db;line-height:1.7;">&iquest;Tendr&iacute;an <strong style="color:#ffffff;">15 minutos esta semana</strong> para que se los muestre en detalle?</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="https://wa.me/5491140682555?text=Hola%20Franco%2C%20vi%20la%20demo%20de%20${encodeURIComponent(params.safeClinic)}%20y%20me%20interesa."
                     style="display:block;background:#25d366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 0;border-radius:8px;text-align:center;">
                    Escribir por WhatsApp
                  </a>
                </td>
                <td style="padding-left:8px;">
                  <a href="mailto:franco@sincroai.net?subject=Demo%20${encodeURIComponent(params.safeClinic)}"
                     style="display:block;background:#1f1f2e;border:1px solid #374151;color:#e5e7eb;text-decoration:none;font-size:13px;font-weight:600;padding:11px 0;border-radius:8px;text-align:center;">
                    Responder email
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding-top:28px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#9ca3af;">Franco Restelli &middot; SincroAI</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">
              <a href="https://sincroai.net" style="color:#8b5cf6;text-decoration:none;">sincroai.net</a>
              &nbsp;&middot;&nbsp;
              <a href="tel:+5491140682555" style="color:#6b7280;text-decoration:none;">+54 11 4068-2555</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#374151;">
              Recibiste este email porque ${sc} forma parte de nuestra investigaci&oacute;n de mercado.<br>
              Si no quer&eacute;s recibir m&aacute;s mensajes, simplemente respond&eacute; "no gracias".
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Cron handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verificar que viene de Vercel Cron (o llamada manual con el secret)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN
  const RESEND_KEY    = process.env.RESEND_API_KEY
  if (!NETLIFY_TOKEN) return NextResponse.json({ error: 'NETLIFY_TOKEN no configurado' }, { status: 500 })
  if (!RESEND_KEY)    return NextResponse.json({ error: 'RESEND_API_KEY no configurado' }, { status: 500 })

  // 1. Buscar leads con email, sin demo enviada, máximo 5
  const { data: leads, error: dbErr } = await supabaseAdmin
    .from('leads')
    .select('id, clinic_name, contact_name, email, phone, instagram, address, stage')
    .neq('email', '')
    .not('email', 'is', null)
    .not('stage', 'in', '("demo_sent","closed","lost")')
    .order('lead_score', { ascending: false })
    .limit(5)

  if (dbErr) {
    console.error('[cron] Error consultando leads:', dbErr.message)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    console.log('[cron] No hay leads pendientes para procesar')
    return NextResponse.json({ processed: 0, message: 'No hay leads pendientes' })
  }

  console.log(`[cron] Procesando ${leads.length} leads`)

  const resend  = new Resend(RESEND_KEY)
  const results: Array<{ id: string; clinic: string; status: 'ok' | 'error'; url?: string; emailId?: string; error?: string }> = []

  for (const lead of leads) {
    const clinicName  = lead.clinic_name  ?? ''
    const contactName = lead.contact_name ?? clinicName
    const firstName   = contactName.split(' ')[0]

    try {
      // 2. Generar y deployar HTML en Netlify
      console.log(`[cron] Deployando demo para: ${clinicName}`)
      const html    = buildDemoHtml({
        clinicName,
        phone:     lead.phone     ?? '',
        email:     lead.email     ?? '',
        instagram: lead.instagram ?? '',
        address:   lead.address   ?? '',
      })
      const demoUrl = await deployToNetlify(clinicName, html, NETLIFY_TOKEN)
      console.log(`[cron] Demo desplegada: ${demoUrl}`)

      // 3. Construir y enviar email
      const safeClinic = clinicName
        .replace(/á/g,'&aacute;').replace(/Á/g,'&Aacute;')
        .replace(/é/g,'&eacute;').replace(/É/g,'&Eacute;')
        .replace(/í/g,'&iacute;').replace(/Í/g,'&Iacute;')
        .replace(/ó/g,'&oacute;').replace(/Ó/g,'&Oacute;')
        .replace(/ú/g,'&uacute;').replace(/Ú/g,'&Uacute;')
        .replace(/ñ/g,'&ntilde;').replace(/Ñ/g,'&Ntilde;')

      const subject  = `${clinicName} — propuesta de sitio web con turnos online`
      const htmlEmail = buildEmailHtml({ firstName, safeClinic, demoUrl })
      const textEmail = `Hola ${firstName},\n\nVi ${clinicName} en Instagram y armé una propuesta de cómo podría verse su sitio web:\n\n${demoUrl}\n\n¿Tienen 15 minutos esta semana?\n\nFranco Restelli\nSincroAI — sincroai.net`

      const { data: emailData, error: resendErr } = await resend.emails.send({
        from:    'Franco de SincroAI <franco@sincroai.net>',
        to:      lead.email!,
        subject,
        html:    htmlEmail,
        text:    textEmail,
      })

      if (resendErr) throw new Error(resendErr.message ?? 'Error Resend')
      console.log(`[cron] Email enviado a ${lead.email} | Resend ID: ${emailData?.id}`)

      // 4. Actualizar lead en Supabase
      await supabaseAdmin.from('leads').update({
        demo_url:     demoUrl,
        stage:        'demo_sent',
        last_contact: new Date().toISOString(),
      }).eq('id', lead.id)

      // 5. Activity log
      supabaseAdmin.from('activity_log').insert({
        agent_id:   'marco',
        agent_name: 'Marco',
        action:     `Demo enviada automáticamente: ${clinicName}`,
        details:    `Deploy: ${demoUrl} | Email: ${lead.email}`,
        category:   'task',
        timestamp:  new Date().toISOString(),
      }).then(() => {})

      results.push({ id: lead.id, clinic: clinicName, status: 'ok', url: demoUrl, emailId: emailData?.id })

      // Pausa entre envíos para no saturar Resend/Netlify
      await new Promise(r => setTimeout(r, 2000))

    } catch (err) {
      const msg = (err as Error).message
      console.error(`[cron] Error procesando ${clinicName}:`, msg)
      results.push({ id: lead.id, clinic: clinicName, status: 'error', error: msg })
    }
  }

  const ok    = results.filter(r => r.status === 'ok').length
  const error = results.filter(r => r.status === 'error').length
  console.log(`[cron] Finalizado: ${ok} OK, ${error} errores`)

  return NextResponse.json({ processed: results.length, ok, error, results })
}
