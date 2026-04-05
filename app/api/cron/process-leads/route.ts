import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sincroai-office-a96b.vercel.app';
const DAILY_LIMIT = 10;

// Vercel Cron: runs daily at 12:00 UTC (9am Argentina)
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get verified leads with score 85+ that haven't been contacted
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('stage', 'prospecto')
    .eq('verified', true)
    .eq('email_verified', true)
    .gte('lead_score', 85)
    .order('lead_score', { ascending: false })
    .limit(DAILY_LIMIT);

  if (error || !leads?.length) {
    return NextResponse.json({
      processed: 0,
      message: error?.message || 'No hay leads verificados para contactar',
    });
  }

  // Cap to daily email limit
  const toProcess = leads.slice(0, DAILY_LIMIT);
  let sent = 0;
  const errors: string[] = [];

  for (const lead of toProcess) {
    try {
      const res = await fetch(`${APP_URL}/api/outreach/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          toEmail: lead.email,
          toName: lead.owner_name || lead.contact_name,
          clinicName: lead.clinic_name,
          type: 'cold',
          demoUrl: lead.demo_url || null,
          service: lead.notes || null,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.json();
        errors.push(`${lead.clinic_name}: ${err.error}`);
      }
    } catch (e: any) {
      errors.push(`${lead.clinic_name}: ${e.message}`);
    }

    // Pause between sends to avoid rate limits
    if (sent < toProcess.length) {
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  await supabaseAdmin.from('activity_log').insert({
    agent_id: 'marco',
    agent_name: 'Marco',
    type: 'action',
    description: `Cron: ${sent} emails enviados de ${toProcess.length} leads verificados`,
  });

  return NextResponse.json({ processed: sent, errors });
}
