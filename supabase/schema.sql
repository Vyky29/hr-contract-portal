-- Prefer PORTALVIC migration: database/migrations/20260521120000_employment_contracts_portal.sql

create table if not exists public.employment_contracts (
  id uuid primary key default gen_random_uuid(),
  signing_token text unique not null,
  contract_reference text not null,
  contract_version text not null default '1.0',
  status text not null default 'awaiting_employee'
    check (status in ('awaiting_employee', 'completed', 'expired')),
  user_id uuid not null references auth.users (id) on delete restrict,
  employee_name text not null,
  employee_email text not null,
  employee_address text,
  contract_date date,
  commencement_date date,
  role text,
  scale text,
  delivery_rate text,
  director_name text,
  form_payload jsonb not null default '{}'::jsonb,
  template_data jsonb not null default '{}'::jsonb,
  director_signature text not null,
  employee_signature text,
  employee_typed_name text,
  employee_acknowledged boolean default false,
  hr_notes text,
  announcement_id uuid,
  document_id uuid,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sent_at timestamptz,
  completed_at timestamptz,
  employee_signed_at timestamptz
);

create index if not exists employment_contracts_signing_token_idx on public.employment_contracts (signing_token);
create index if not exists employment_contracts_status_idx on public.employment_contracts (status);
create index if not exists employment_contracts_created_at_idx on public.employment_contracts (created_at desc);

alter table public.employment_contracts enable row level security;
