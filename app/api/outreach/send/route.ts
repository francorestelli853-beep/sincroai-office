import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailType = 'cold' | 'follow_up_1' | 'follow_up_2';

function buildEmail(
  type: EmailType,
  toName: string,
  clinicName: string,
  demoUrl?: string,
  service?: string
): { subject: string; body: string } {
  const name = toName || clinicName;
  const serviceText = service || 'tratamientos estéticos';

  switch (type) {
    case 'cold':
      return {
        subject: `${clinicName} — propuesta de sitio web con turnos online`,
        body: `Hola ${name},

Vi el perfil de ${clinicName} y me llamó la atención el trabajo que hacen con ${serviceText}.

Te armé algo para mostrarte cómo se vería un sistema de turnos y respuestas automáticas para tu centro${demoUrl ? `:\n${demoUrl}` : '.'}

Si te interesa, podemos hablar 15 minutos esta semana.

Franco Restelli
SincroAI
sincroai.net
+54 11 4068-2555`,
      };

    case 'follow_up_1':
      return {
        subject: `Re: ${clinicName}`,
        body: `Hola ${name}, te escribí hace unos días.

No sé si llegaste a ver la propuesta que armé para ${clinicName}${demoUrl ? `:\n${demoUrl}` : '.'}

Cualquier cosa me escribís.

Franco`,
      };

    case 'follow_up_2':
      return {
        subject: `Re: ${clinicName}`,
        body: `${name}, último mensaje de mi parte.

Si en algún momento necesitás automatizar turnos o respuestas en ${clinicName}, escribime directo al WhatsApp:
wa.me/5491140682555

Franco`,
      };
  }
}

// POST /api/outreach/send
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    leadId,
    toEmail,
    toName,
    clinicName,
    type = 'cold',
    demoUrl,
    service,
  } = body;

  if (!toEmail || !clinicName) {
    return NextResponse.json(
      { error: 'toEmail y clinicName son requeridos' },
      { status: 400 }
    );
  }

  const email = buildEmail(type as EmailType, toName, clinicName, demoUrl, service);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Franco de SincroAI <franco@sincroai.net>',
      to: toEmail,
      subject: email.subject,
      text: email.body,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabaseAdmin.from('emails_sent').insert({
      lead_id: leadId || null,
      to_email: toEmail,
      to_name: toName || null,
      subject: email.subject,
      body: email.body,
      resend_id: data?.id || null,
      type,
    });

    const agentName = type === 'cold' ? 'Marco' : 'Nexo';
    const agentId = type === 'cold' ? 'marco' : 'nexo';

    await supabaseAdmin.from('activity_log').insert({
      agent_id: agentId,
      agent_name: agentName,
      type: 'action',
      description: `${type === 'cold' ? 'Email enviado' : `Follow-up ${type === 'follow_up_1' ? '1' : '2'}`} a ${toName || toEmail} (${clinicName})`,
    });

    if (leadId) {
      const updates: Record<string, any> = {
        last_contact: new Date().toISOString(),
      };
      if (type === 'cold') {
        updates.stage = 'contactado';
      } else if (type === 'follow_up_1') {
        updates.follow_up_count = 1;
        updates.follow_up_1_at = new Date().toISOString();
      } else if (type === 'follow_up_2') {
        updates.follow_up_count = 2;
        updates.follow_up_2_at = new Date().toISOString();
      }
      await supabaseAdmin.from('leads').update(updates).eq('id', leadId);
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
