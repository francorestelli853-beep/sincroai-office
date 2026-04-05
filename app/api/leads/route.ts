export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leads - Get all leads
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('lead_number', { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clinic_name, location, contact_name, email, phone, notes, instagram, address, stage } = body;

  if (!clinic_name) {
    return NextResponse.json(
      { error: 'clinic_name es requerido' },
      { status: 400 }
    );
  }

  // Deduplicación: verificar si ya existe por instagram o email
  if (instagram || email) {
    const orFilter = [
      instagram ? `instagram.eq.${instagram}` : null,
      email     ? `email.eq.${email}`         : null,
    ].filter(Boolean).join(',')

    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, clinic_name, stage')
      .or(orFilter)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { duplicate: true, existing_id: existing.id, clinic_name: existing.clinic_name, stage: existing.stage },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      clinic_name,
      location:     location     ?? null,
      contact_name: contact_name ?? null,
      email:        email        ?? null,
      phone:        phone        ?? null,
      notes:        notes        ?? null,
      instagram:    instagram    ?? null,
      address:      address      ?? null,
      stage:        stage        ?? 'new',
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
