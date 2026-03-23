export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leads - Get all leads
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clinic_name, location, contact_name, email, phone, notes } = body;

  if (!clinic_name || !email) {
    return NextResponse.json(
      { error: 'clinic_name y email son requeridos' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      clinic_name,
      location,
      contact_name,
      email,
      phone,
      notes,
      stage: 'prospecto',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabaseAdmin.from('activity_log').insert({
    agent_id: 'outreach',
    agent_name: 'Outreach',
    agent_emoji: '🎯',
    type: 'task',
    description: `Nuevo prospecto agregado: ${clinic_name} (${email})`,
    linked_task: 'Gestión de Leads',
  });

  return NextResponse.json({ lead: data });
}
