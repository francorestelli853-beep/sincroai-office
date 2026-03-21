-- SincroAI Virtual Office - Database Schema
-- Run this in Supabase SQL Editor

-- Leads table
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  clinic_name text not null,
  location text,
  contact_name text,
  email text not null,
  phone text,
  stage text default 'prospecto',
  assigned_agent text default 'outreach',
  notes text,
  last_contact timestamptz,
  created_at timestamptz default now()
);

-- Activity log
create table if not exists activity_log (
  id uuid default gen_random_uuid() primary key,
  agent_id text not null,
  agent_name text not null,
  agent_emoji text,
  type text not null,
  description text not null,
  linked_task text,
  to_agent_id text,
  to_agent_name text,
  to_agent_emoji text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Agent messages
create table if not exists agent_messages (
  id uuid default gen_random_uuid() primary key,
  from_agent_id text not null,
  from_agent_name text not null,
  from_agent_emoji text,
  to_agent_id text not null,
  to_agent_name text not null,
  to_agent_emoji text,
  message text not null,
  created_at timestamptz default now()
);

-- Commands
create table if not exists commands (
  id uuid default gen_random_uuid() primary key,
  target_agent text not null,
  command text not null,
  status text default 'enviado',
  result text,
  created_at timestamptz default now()
);

-- Emails sent
create table if not exists emails_sent (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id),
  to_email text not null,
  to_name text,
  subject text,
  body text,
  resend_id text,
  status text default 'sent',
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security)
alter table leads enable row level security;
alter table activity_log enable row level security;
alter table agent_messages enable row level security;
alter table commands enable row level security;
alter table emails_sent enable row level security;

-- Allow public read/write (for demo - tighten in production)
create policy "Allow all" on leads for all using (true);
create policy "Allow all" on activity_log for all using (true);
create policy "Allow all" on agent_messages for all using (true);
create policy "Allow all" on commands for all using (true);
create policy "Allow all" on emails_sent for all using (true);
