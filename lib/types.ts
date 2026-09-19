/** Tipos de domínio ConsultaJáAdv */

export type Role = "admin" | "lawyer" | "client";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled";

export type ConsultationStatus =
  | "pending"
  | "accepted"
  | "in_call"
  | "completed"
  | "cancelled";

/** Anonimato OPCIONAL: cliente escolhe identificado ou anônimo */
export type ConsultationKind = "identified" | "anonymous";

export type SacStatus = "open" | "in_progress" | "resolved" | "closed";

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type PayoutReleaseStatus =
  | "pending_client"
  | "eligible"
  | "needs_admin_review"
  | "released"
  | "denied";

/** Preços default (espelham platform_settings) — provisórios */
export const DEFAULT_PRICES = {
  monthlyFeeCents: 5000, // R$50 mensalidade (= e-mails)
  priceCents: 10000, // R$100 / hora
  lawyerCutCents: 8000, // R$80 ao advogado
  platformCutCents: 2000, // R$20 plataforma
  sessionMinutes: 60,
} as const;

export type Admin = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type Lawyer = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  oab: string | null;
  /** WhatsApp E.164 ou BR — obrigatório no cadastro */
  whatsapp: string | null;
  pix_key: string | null;
  subscription_status: SubscriptionStatus;
  /** ISO — mensalidade libera alertas de e-mail por 30 dias */
  subscription_expires_at: string | null;
  verification_status: VerificationStatus;
  online: boolean;
  payout_balance_cents: number;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  credits_cents: number;
  created_at: string;
  updated_at: string;
};

export type AnonymousUser = {
  id: string;
  session_token: string;
  created_at: string;
};

export type ConsultationRequest = {
  id: string;
  status: ConsultationStatus;
  is_anonymous: boolean;
  client_id: string | null;
  anonymous_user_id: string | null;
  lawyer_id: string | null;
  specialty: string;
  subject_summary: string | null;
  price_cents: number;
  lawyer_cut_cents: number;
  platform_cut_cents: number;
  paid_at: string | null;
  accepted_at: string | null;
  call_started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_requested: boolean;
  refunded_at: string | null;
  payout_credited: boolean;
  attendance_confirmed_by_client: boolean;
  attendance_confirmed_at: string | null;
  client_rating_of_lawyer: number | null;
  client_rating_comment: string | null;
  lawyer_rating_of_client: number | null;
  lawyer_rating_comment: string | null;
  payout_release_status: PayoutReleaseStatus;
  sac_linked_at: string | null;
  payout_withheld: boolean;
  payout_withheld_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditsLedgerEntry = {
  id: string;
  client_id: string;
  amount_cents: number;
  reason: string;
  consultation_request_id: string | null;
  created_at: string;
};

export type SacTicket = {
  id: string;
  requester_email: string | null;
  subject: string;
  body: string;
  consultation_request_id: string | null;
  proof_note: string | null;
  status: SacStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSettings = {
  id: string;
  monthly_fee_cents: number;
  price_cents: number;
  lawyer_cut_cents: number;
  platform_cut_cents: number;
  session_duration_minutes: number;
  created_at: string;
  updated_at: string;
};

export type Payout = {
  id: string;
  lawyer_id: string;
  consultation_request_id: string | null;
  amount_cents: number;
  pix_key: string;
  status: PayoutStatus;
  provider_ref: string | null;
  payout_batch_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export type PayoutBatch = {
  id: string;
  label: string;
  status: "open" | "paid";
  total_cents: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
};

export type EmailLogEntry = {
  id: string;
  to: string;
  subject: string;
  reason: string;
  created_at: string;
};

export type SessionPayload = {
  role: Role;
  sub: string;
  email: string;
};
