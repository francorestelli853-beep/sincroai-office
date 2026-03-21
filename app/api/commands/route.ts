import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { commandHistory as mockCommands } from '@/lib/mock-data';

// GET /api/commands - Get command history
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ commands: mockCommands });
  }

  const commands = data.map((cmd: any) => ({
    id: cmd.id,
    timestamp: cmd.created_at,
    targetAgent: cmd.target_agent,
    command: cmd.command,
    status: cmd.status,
    result: cmd.result,
  }));

  return NextResponse.json({ commands });
}

// POST /api/commands - Create a new command
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { target_agent, command } = body;

  if (!command) {
    return NextResponse.json({ error: 'command es requerido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('commands')
    .insert({
      target_agent: target_agent || 'todos',
      command,
      status: 'enviado',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabaseAdmin.from('activity_log').insert({
    agent_id: 'system',
    agent_name: 'Sistema',
    agent_emoji: '⚡',
    type: 'action',
    description: `Comando enviado a ${target_agent || 'todos'}: "${command}"`,
  });

  return NextResponse.json({ command: data });
}
