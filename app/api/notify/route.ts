export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Fase 2: agregar webhook a n8n para notificaciones en tiempo real

const NOTIFY_TO = 'aisincro@gmail.com'
const NOTIFY_FROM = 'SincroAI Office <onboarding@resend.dev>'

type NotificationType = 'task-completed' | 'error' | 'needs-attention' | 'daily-report'

interface NotifyBody {
  agentId: string
  type: NotificationType
  message: string
  details?: string
}

const AGENT_NAMES: Record<string, string> = {
  luna: '🔍 Luna',
  marco: '🤝 Marco',
  vera: '⚡ Vera',
  atlas: '🛡️ Atlas',
  nova: '📊 Nova',
}

const TYPE_LABELS: Record<NotificationType, string> = {
  'task-completed': '✅ Tarea Completada',
  'error': '🚨 Error Detectado',
  'needs-attention': '⚠️ Requiere Atención',
  'daily-report': '📋 Reporte Diario',
}

const TYPE_COLORS: Record<NotificationType, string> = {
  'task-completed': '#10b981',
  'error': '#ef4444',
  'needs-attention': '#f59e0b',
  'daily-report': '#8b5cf6',
}

function buildEmailHtml({
  agentName,
  type,
  message,
  details,
  timestamp,
}: {
  agentName: string
  type: NotificationType
  message: string
  details?: string
  timestamp: string
}): string {
  const typeLabel = TYPE_LABELS[type]
  const accentColor = TYPE_COLORS[type]

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SincroAI Office — Notificación</title>
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030712;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo / Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ✦ SincroAI Office
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
                Sistema de agentes autónomos
              </p>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="padding-bottom:24px;">
              <div style="height:3px;background:linear-gradient(90deg,${accentColor},transparent);border-radius:2px;"></div>
            </td>
          </tr>

          <!-- Type badge -->
          <tr>
            <td style="padding-bottom:16px;">
              <span style="display:inline-block;background-color:${accentColor}22;color:${accentColor};border:1px solid ${accentColor}44;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;">
                ${typeLabel}
              </span>
            </td>
          </tr>

          <!-- Agent name -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:13px;color:#9ca3af;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">
                Agente
              </p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">
                ${agentName}
              </p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:20px 0;">
              <div style="background-color:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px 24px;">
                <p style="margin:0;font-size:16px;color:#f3f4f6;line-height:1.6;font-weight:500;">
                  ${message}
                </p>
                ${details ? `
                <hr style="border:none;border-top:1px solid #1f2937;margin:16px 0;" />
                <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">
                  ${details}
                </p>` : ''}
              </div>
            </td>
          </tr>

          <!-- Timestamp -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                🕐 ${timestamp}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-bottom:40px;">
              <a
                href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}"
                style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;"
              >
                Abrir Oficina Virtual →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1f2937;padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                Este mensaje fue generado automáticamente por SincroAI Office.
                Si no esperabas esta notificación, podés ignorarla.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let body: NotifyBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, type, message, details } = body

  if (!agentId || !type || !message) {
    return NextResponse.json(
      { error: 'Missing required fields: agentId, type, message' },
      { status: 400 }
    )
  }

  const agentName = AGENT_NAMES[agentId] ?? agentId
  const typeLabel = TYPE_LABELS[type] ?? type
  const timestamp = new Date().toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  })

  const subject = `[SincroAI] ${typeLabel}: ${agentName} — ${message}`

  const html = buildEmailHtml({ agentName, type, message, details, timestamp })

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      html,
    })

    if (error) {
      console.error('[notify] Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email', detail: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notify] Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
