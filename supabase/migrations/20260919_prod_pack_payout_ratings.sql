-- ConsultaJáAdv production pack (mirror of Psico): whatsapp, subscription expiry,
-- OAB verification, client attendance confirm, mutual ratings, payout hold/release, batches.

alter table if exists lawyers
  add column if not exists whatsapp text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists verification_status text not null default 'pending';

alter table if exists lawyers
  drop constraint if exists lawyers_verification_status_check;
alter table if exists lawyers
  add constraint lawyers_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected'));

create index if not exists lawyers_verification_idx on lawyers (verification_status);

alter table if exists consultation_requests
  add column if not exists attendance_confirmed_by_client boolean not null default false,
  add column if not exists attendance_confirmed_at timestamptz,
  add column if not exists client_rating_of_lawyer integer,
  add column if not exists client_rating_comment text,
  add column if not exists lawyer_rating_of_client integer,
  add column if not exists lawyer_rating_comment text,
  add column if not exists payout_release_status text not null default 'pending_client',
  add column if not exists sac_linked_at timestamptz,
  add column if not exists payout_withheld boolean not null default false,
  add column if not exists payout_withheld_reason text;

alter table if exists consultation_requests
  drop constraint if exists consultation_requests_payout_release_status_check;
alter table if exists consultation_requests
  add constraint consultation_requests_payout_release_status_check
  check (payout_release_status in (
    'pending_client', 'eligible', 'needs_admin_review', 'released', 'denied'
  ));

alter table if exists payouts
  add column if not exists payout_batch_id uuid;

create table if not exists payout_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null default 'open' check (status in ('open', 'paid')),
  total_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

comment on column lawyers.whatsapp is 'E.164/BR WhatsApp required — call room uses wa.me';
comment on column consultation_requests.payout_release_status is 'No auto LivePix transfer; admin batches on days 10/28';
