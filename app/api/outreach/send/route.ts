export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/outreach/send - Send a cold email to a lead
export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await request.json();
  const { leadId, toEmail, toName, clinicName } = body;

  if (!toEmail || !clinicName) {
    return NextResponse.json(
      { error: 'toEmail y clinicName son requeridos' },
      { status: 400 }
    );
  }

  const subject = `¿${clinicName} está perdiendo citas por falta de seguimiento?`;
  const bodyText = `Hola ${toName || 'equipo'},

Vi que ${clinicName} tiene presencia activa en Instagram y quería escribirte directamente.

En clínicas estéticas como la tuya, el mayor problema no es la falta de interés — es la falta de seguimiento. Mensajes que quedan sin respuesta, leads que preguntan el precio y desaparecen, citas que se olvidan.

En SincroAI automatizamos todo eso:
✅ Respuesta a DMs en menos de 5 segundos, 24/7
✅ Calificación automática de leads con IA  
✅ Agendamiento directo en tu calendario
✅ Recordatorios anti no-show (reducimos ausencias un 60%)

Garantizamos 10 citas recuperadas en los primeros 30 días o el siguiente mes es gratis.

¿Tiene sentido agendar una llamada de 15 minutos esta semana?

Franco Restelli
SincroAI — sincroai.net
+54 11 4068-2555`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Franco de SincroAI <franco@sincroai.net>',
      to: toEmail,
      subject,
      text: bodyText,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log to Supabase
    await supabaseAdmin.from('emails_sent').insert({
      lead_id: leadId || null,
      to_email: toEmail,
      to_name: toName || null,
      subject,
      body: bodyText,
      resend_id: data?.id || null,
    });

    await supabaseAdmin.from('activity_log').insert({
      agent_id: 'outreach',
      agent_name: 'Outreach',
      agent_emoji: '🎯',
      type: 'action',
      description: `Email en frío enviado a ${toName || toEmail} (${clinicName}) — ${toEmail}`,
      linked_task: 'Campaña Email Frío',
    });

    if (leadId) {
      await supabaseAdmin
        .from('leads')
        .update({
          stage: 'contactado',
          last_contact: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (err: any) {
    console.error('Send error:', err);
    return NextResponse.json(
      { error: err.message || 'Error enviando email' },
      { status: 500 }
    );
  }
}
