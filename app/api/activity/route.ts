import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { activityLog as mockActivity } from '@/lib/mock-data';

// GET /api/activity - Get activity log from Supabase (fallback to mock)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    // Fallback to mock data if DB empty or error
    return NextResponse.json({ activity: mockActivity });
  }

  // Transform to match expected format
  const activity = data.map((entry: any) => ({
    id: entry.id,
    timestamp: entry.created_at,
    agentId: entry.agent_id,
    agentName: entry.agent_name,
    agentEmoji: entry.agent_emoji,
    type: entry.type,
    description: entry.description,
    linkedTask: entry.linked_task,
    toAgentId: entry.to_agent_id,
    toAgentName: entry.to_agent_name,
    toAgentEmoji: entry.to_agent_emoji,
  }));

  return NextResponse.json({ activity });
}
