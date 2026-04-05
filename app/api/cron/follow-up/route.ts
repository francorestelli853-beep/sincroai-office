import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sincroai-office-a96b.vercel.app';
const DAILY_FOLLOW_UP_LIMIT = 2;

// Vercel Cron: runs daily at 14:00 UTC (11am Argentina)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let totalSent = 0;
  const errors: string[] = [];

  // Follow-up 1: leads contactados hace 3+ dias sin follow-up
  if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
    const { data: leads1 } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('stage', 'contactado')
      .eq('follow_up_count', 0)
      .lt('last_contact', threeDaysAgo)
      .order('last_contact', { ascending: true })
      .limit(DAILY_FOLLOW_UP_LIMIT - totalSent);

    if (leads1?.length) {
      for (const lead of leads1) {
        if (totalSent >= DAILY_FOLLOW_UP_LIMIT) break;
        try {
          const res = await fetch(`${APP_URL}/api/outreach/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              toEmail: lead.email,
              toName: lead.owner_name || lead.contact_name,
              clinicName: lead.clinic_name,
              type: 'follow_up_1',
              demoUrl: lead.demo_url || null,
            }),
          });

          if (res.ok) totalSent++;
          else {
            const err = await res.json();
            errors.push(`FU1 ${lead.clinic_name}: ${err.error}`);
          }
        } catch (e: any) {
          errors.push(`FU1 ${lead.clinic_name}: ${e.message}`);
        }

        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }

  // Follow-up 2: leads con 1 follow-up hace 7+ dias del primer contacto
  if (totalSent < DAILY_FOLLOW_UP_LIMIT) {
    const { data: leads2 } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('stage', 'contactado')
      .eq('follow_up_count', 1)
      .lt('follow_up_1_at', sevenDaysAgo)
      .order('follow_up_1_at', { ascending: true })
      .limit(DAILY_FOLLOW_UP_LIMIT - totalSent);

    if (leads2?.length) {
      for (const lead of leads2) {
        if (totalSent >= DAILY_FOLLOW_UP_LIMIT) break;
        try {
          const res = await fetch(`${APP_URL}/api/outreach/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              toEmail: lead.email,
              toName: lead.owner_name || lead.contact_name,
              clinicName: lead.clinic_name,
              type: 'follow_up_2',
            }),
          });

          if (res.ok) totalSent++;
          else {
            const err = await res.json();
            errors.push(`FU2 ${lead.clinic_name}: ${err.error}`);
          }
        } catch (e: any) {
          errors.push(`FU2 ${lead.clinic_name}: ${e.message}`);
        }

        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }

  if (totalSent > 0) {
    await supabaseAdmin.from('activity_log').insert({
      agent_id: 'nexo',
      agent_name: 'Nexo',
      type: 'action',
      description: `Cron: ${totalSent} follow-ups enviados`,
    });
  }

  return NextResponse.json({
    follow_ups_sent: totalSent,
    errors,
  });
}
