-- ConsultaJáAdv — PHASE 1 schema (Supabase-ready)
-- Posicionamento: consultas rápidas com advogados
-- MVP: anonimato OPCIONAL na requisição (cliente escolhe identificado ou anônimo)
-- Preços provisórios (cents BRL): R$100/hora → advogado R$80 + plataforma R$20
-- Mensalidade advogado: R$50 (= acesso a e-mails de solicitação)
-- Payout Pix ao advogado SOMENTE após sessão completed / timer 60min
-- SAC: somente admin lê
-- specialty: visível ANTES do accept; subject_summary: visível SÓ DEPOIS do accept

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- platform_settings (singleton-ish; app usa a primeira linha)
-- ---------------------------------------------------------------------------
create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_fee_cents integer not null default 5000,       -- mensalidade advogado R$50 (LivePix depois)
  price_cents integer not null default 10000,            -- cliente: R$100 / hora (provisório)
  lawyer_cut_cents integer not null default 8000,        -- corte advogado: R$80
  platform_cut_cents integer not null default 2000,      -- corte plataforma: R$20
  session_duration_minutes integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into platform_settings default values
  on conflict do nothing;

-- ---------------------------------------------------------------------------
-- admins — primeiro acesso cria; segundo signup = erro (enforced na app + unique email)
-- ---------------------------------------------------------------------------
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Garante no máximo 1 admin via constraint parcial (PostgreSQL)
-- App também rejeita segundo signup; esta constraint reforça.
create unique index if not exists admins_single_row
  on admins ((true));

-- ---------------------------------------------------------------------------
-- lawyers
-- ---------------------------------------------------------------------------
-- Mensalidade: active = recebe e-mail de solicitações.
-- Online (mesmo sem mensalidade) = pode Aceitar na fila + payout após 60min.
-- Lucro plataforma = split da consulta.
create table if not exists lawyers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  oab text,                                              -- OAB (opcional no skeleton)
  pix_key text,                                          -- chave Pix para payout
  subscription_status text not null default 'pending'
    check (subscription_status in ('pending', 'active', 'past_due', 'cancelled')),
  online boolean not null default false,                 -- online pode aceitar fila (mesmo sem mensalidade)
  payout_balance_cents integer not null default 0,       -- acumulado após sessões completed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fila: quem está online (mensalidade NÃO obrigatória para aceitar)
create index if not exists lawyers_online_idx
  on lawyers (online) where online = true;

-- E-mail blast: só mensalidade active
create index if not exists lawyers_email_blast_idx
  on lawyers (subscription_status) where subscription_status = 'active';

-- ---------------------------------------------------------------------------
-- clients (identificados: conta + créditos)
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  credits_cents integer not null default 0,              -- saldo em centavos
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- anonymous_users — suporte a pedido anônimo opcional
-- ---------------------------------------------------------------------------
create table if not exists anonymous_users (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,                    -- token opaco do browser
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- consultation_requests / sessions
-- status: pending | accepted | in_call | completed | cancelled
-- lawyer_id nullable até aceitar
-- is_anonymous: cliente pode escolher identificado OU anônimo
-- specialty: PÚBLICO (visível na fila antes do accept)
-- subject_summary: PRIVADO (visível ao advogado SÓ após accept)
-- ---------------------------------------------------------------------------
create table if not exists consultation_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'in_call', 'completed', 'cancelled')),
  is_anonymous boolean not null default false,
  client_id uuid references clients (id) on delete cascade,           -- null se anônimo
  anonymous_user_id uuid references anonymous_users (id) on delete set null,
  lawyer_id uuid references lawyers (id) on delete set null,          -- null até accept
  specialty text not null,                                            -- visível ANTES do accept
  subject_summary text,                                               -- visível SÓ DEPOIS do accept
  price_cents integer not null,                                       -- cobrado do usuário
  lawyer_cut_cents integer not null,                                  -- crédito ao advogado após completed
  platform_cut_cents integer not null default 2000,                   -- corte plataforma
  paid_at timestamptz,
  accepted_at timestamptz,
  call_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  -- Reembolso: NÃO automático; somente via SAC com comprovante
  refund_requested boolean not null default false,
  refunded_at timestamptz,
  payout_credited boolean not null default false,        -- crédito ao advogado já aplicado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultation_requester_chk check (
    (is_anonymous = false and client_id is not null)
    or (is_anonymous = true and anonymous_user_id is not null)
  )
);

create index if not exists consultation_requests_pending_idx
  on consultation_requests (status, created_at)
  where status = 'pending';

create index if not exists consultation_requests_lawyer_idx
  on consultation_requests (lawyer_id, status);

create index if not exists consultation_requests_specialty_idx
  on consultation_requests (specialty)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- credits_ledger (movimentações de crédito de clientes identificados)
-- ---------------------------------------------------------------------------
create table if not exists credits_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  amount_cents integer not null,                         -- positivo = crédito; negativo = débito
  reason text not null,                                  -- purchase | session_charge | refund_sac | adjustment
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credits_ledger_client_idx
  on credits_ledger (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- sac_tickets — formulário público; SOMENTE admin lê
-- ---------------------------------------------------------------------------
create table if not exists sac_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_email text,
  subject text not null,
  body text not null,
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  proof_note text,                                       -- referência a comprovante (reembolso só via SAC)
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sac_tickets_status_idx
  on sac_tickets (status, created_at desc);

-- ---------------------------------------------------------------------------
-- payouts (histórico; Pix ao advogado APÓS session completed)
-- ---------------------------------------------------------------------------
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references lawyers (id) on delete cascade,
  consultation_request_id uuid references consultation_requests (id) on delete set null,
  amount_cents integer not null,
  pix_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed')),
  provider_ref text,                                     -- LivePix / outro stub
  created_at timestamptz not null default now(),
  paid_at timestamptz
);


-- ---------------------------------------------------------------------------
-- email_log — stub / audit de e-mails enviados (EmailLogEntry)
-- ---------------------------------------------------------------------------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,                                -- EmailLogEntry.to
  subject text not null,
  reason text not null,                                  -- e.g. new_request_blast | generic
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx
  on email_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Notas de produto (comentários SQL)
-- * Advogados: registrar, pagar mensalidade (LivePix depois), ficar ONLINE e
--   aceitar fila pendente (não só e-mail). Sem mensalidade = sem e-mail.
-- * Anonimato OPCIONAL: cliente escolhe identificado ou anônimo na requisição.
-- * specialty público antes do accept; subject_summary só após accept.
-- * Preço provisório: R$100/hora → R$80 advogado + R$20 plataforma.
-- * Admin: primeiro acesso cria; segundo signup = erro.
-- * Payout Pix somente após completed / timer 60min.
