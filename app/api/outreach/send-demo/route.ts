export const dynamic = 'force-dynamic'

/**
 * POST /api/outreach/send-demo
 *
 * Envía el email de presentación de demo al lead.
 * PRE-REQUISITO SUPABASE:
 *   ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_url TEXT;
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

// ── HTML email template ────────────────────────────────────────────────────────

function buildDemoEmail(params: {
  contactName: string
  clinicName: string
  demoUrl: string
}): { subject: string; html: string; text: string } {
  const { contactName, clinicName, demoUrl } = params
  const firstName = contactName.split(' ')[0]

  // Escapar caracteres especiales → entidades HTML (evita problemas de encoding en clientes de email)
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/á/g, '&aacute;').replace(/Á/g, '&Aacute;')
    .replace(/é/g, '&eacute;').replace(/É/g, '&Eacute;')
    .replace(/í/g, '&iacute;').replace(/Í/g, '&Iacute;')
    .replace(/ó/g, '&oacute;').replace(/Ó/g, '&Oacute;')
    .replace(/ú/g, '&uacute;').replace(/Ú/g, '&Uacute;')
    .replace(/ü/g, '&uuml;') .replace(/Ü/g, '&Uuml;')
    .replace(/ñ/g, '&ntilde;').replace(/Ñ/g, '&Ntilde;')

  const safeClinic    = esc(clinicName)
  const safeFirstName = esc(firstName)

  const subject = `${clinicName} — propuesta de sitio web con turnos online`

  const text = `Hola ${firstName},

Vi ${clinicName} en Instagram y me tomé unos minutos para armar una propuesta de cómo podría verse su sitio web profesional con sistema de turnos incluido:

${demoUrl}

¿Tendrían 15 minutos esta semana para que se los muestre en detalle?

Franco Restelli
SincroAI — sincroai.net
+54 11 4068-2555`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">
                Sincro<span style="color:#8b5cf6;">AI</span>
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
                Automatización para clínicas estéticas
              </p>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#18181f;border:1px solid #27272f;border-radius:16px;padding:36px 32px;">

              <!-- Saludo -->
              <p style="margin:0 0 20px;font-size:16px;color:#e5e7eb;line-height:1.6;">
                Hola <strong style="color:#ffffff;">${safeFirstName}</strong>,
              </p>

              <p style="margin:0 0 20px;font-size:15px;color:#d1d5db;line-height:1.7;">
                Vi <strong style="color:#ffffff;">${safeClinic}</strong> en Instagram
                y me tom&eacute; unos minutos para armar una propuesta de c&oacute;mo podr&iacute;a verse
                su sitio web profesional con sistema de turnos incluido.
              </p>

              <!-- Demo preview box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e1b3a 0%,#12101e 100%);border:1px solid #3b3458;border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:11px;color:#8b5cf6;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
                      Su demo personalizada
                    </p>
                    <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;">
                      ${safeClinic} &mdash; sitio web + turnos online
                    </p>
                    <!-- CTA button -->
                    <a href="${demoUrl}"
                       style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.2px;">
                      Ver demo →
                    </a>
                    <p style="margin:16px 0 0;font-size:11px;color:#6b7280;word-break:break-all;">
                      ${demoUrl}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Qué incluye -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;">
                La demo incluye
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${[
                  ['🗓️', 'Sistema de turnos online integrado'],
                  ['📱', 'Diseño mobile-first adaptado a su clínica'],
                  ['💬', 'Chat de WhatsApp y chatbot de consultas'],
                  ['⭐', 'Sección de reseñas y galería de servicios'],
                ].map(([icon, text]) => `
                <tr>
                  <td style="padding:6px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;font-size:16px;">${icon}</td>
                        <td style="font-size:14px;color:#d1d5db;">${text}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA final -->
              <p style="margin:0 0 28px;font-size:15px;color:#d1d5db;line-height:1.7;">
                &iquest;Tendr&iacute;an <strong style="color:#ffffff;">15 minutos esta semana</strong>
                para que se los muestre en detalle?
              </p>

              <!-- Botones de respuesta -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="https://wa.me/5491140682555?text=Hola%20Franco%2C%20vi%20la%20demo%20de%20${encodeURIComponent(clinicName)}%20y%20me%20interesa%20saber%20m%C3%A1s."
                       style="display:block;background:#25d366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 0;border-radius:8px;text-align:center;">
                      Escribir por WhatsApp
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="mailto:franco@sincroai.net?subject=Demo%20${encodeURIComponent(clinicName)}&body=Hola%20Franco%2C%20me%20interesa%20la%20demo."
                       style="display:block;background:#1f1f2e;border:1px solid #374151;color:#e5e7eb;text-decoration:none;font-size:13px;font-weight:600;padding:11px 0;border-radius:8px;text-align:center;">
                      Responder email
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#9ca3af;">
                Franco Restelli · SincroAI
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;">
                <a href="https://sincroai.net" style="color:#8b5cf6;text-decoration:none;">sincroai.net</a>
                &nbsp;·&nbsp;
                <a href="tel:+5491140682555" style="color:#6b7280;text-decoration:none;">+54 11 4068-2555</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#374151;">
                Recibiste este email porque ${safeClinic} forma parte de nuestra investigaci&oacute;n de mercado.
                <br>Si no querés recibir más mensajes, simplemente respondé "no gracias".
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parsear body ────────────────────────────────────────────────────────
  let body: {
    lead_id?: string
    clinic_name?: string
    contact_name?: string
    email?: string
    demo_url?: string
  }

  try {
    body = await req.json()
  } catch (parseErr) {
    console.error('[send-demo] Error parseando body:', parseErr)
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { lead_id, clinic_name, contact_name, email, demo_url } = body

  console.log('[send-demo] body recibido:', { lead_id, clinic_name, contact_name, email, demo_url: demo_url?.slice(0, 60) })

  if (!email || !clinic_name || !demo_url) {
    return NextResponse.json(
      { error: 'email, clinic_name y demo_url son requeridos' },
      { status: 400 }
    )
  }

  // ── 2. Verificar API key ───────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[send-demo] RESEND_API_KEY no configurada')
    return NextResponse.json({ error: 'Resend no configurado (falta RESEND_API_KEY)' }, { status: 500 })
  }

  // ── 3. Construir email ─────────────────────────────────────────────────────
  let subject: string, html: string, text: string
  try {
    ;({ subject, html, text } = buildDemoEmail({
      contactName: contact_name ?? clinic_name,
      clinicName:  clinic_name,
      demoUrl:     demo_url,
    }))
  } catch (buildErr) {
    console.error('[send-demo] Error construyendo email:', buildErr)
    return NextResponse.json({ error: 'Error interno al construir el email' }, { status: 500 })
  }

  // ── 4. Enviar via Resend ──────────────────────────────────────────────────
  try {
    const resend = new Resend(apiKey)

    console.log('[send-demo] Enviando a:', email, '| subject:', subject)

    const { data: emailData, error: resendErr } = await resend.emails.send({
      from:    'Franco de SincroAI <franco@sincroai.net>',
      to:      email,
      subject,
      html,
      text,
    })

    if (resendErr) {
      console.error('[send-demo] Resend devolvió error:', JSON.stringify(resendErr))
      return NextResponse.json(
        { error: resendErr.message ?? 'Error de Resend' },
        { status: 400 }
      )
    }

    console.log('[send-demo] Email enviado OK. Resend ID:', emailData?.id)

    // ── 5. Actualizar lead (fire-and-forget) ────────────────────────────────
    if (lead_id) {
      supabaseAdmin
        .from('leads')
        .update({ stage: 'demo_sent', last_contact: new Date().toISOString() })
        .eq('id', lead_id)
        .then(({ error: e }) => {
          if (e) console.warn('[send-demo] Error actualizando lead stage:', e.message)
          else console.log('[send-demo] Lead stage → demo_sent:', lead_id)
        })
    }

    // ── 6. Activity log (fire-and-forget) ───────────────────────────────────
    supabaseAdmin.from('activity_log').insert({
      agent_id:   'marco',
      agent_name: 'Marco',
      action:     `Demo enviada: ${clinic_name}`,
      details:    `Email enviado a ${contact_name ?? email} (${email}) — ${demo_url}`,
      category:   'task',
      timestamp:  new Date().toISOString(),
    }).then(({ error: e }) => {
      if (e) console.warn('[send-demo] Error en activity_log:', e.message)
    })

    // ── 7. emails_sent (fire-and-forget) ────────────────────────────────────
    supabaseAdmin.from('emails_sent').insert({
      lead_id:   lead_id ?? null,
      to_email:  email,
      to_name:   contact_name ?? null,
      subject,
      body:      text,
      resend_id: emailData?.id ?? null,
    }).then(({ error: e }) => {
      if (e) console.warn('[send-demo] Error en emails_sent:', e.message)
    })

    return NextResponse.json({ success: true, emailId: emailData?.id ?? null })

  } catch (err) {
    console.error('[send-demo] Error inesperado:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
