/** Tipos de domínio ConsultaJáAdv (skeleton) */

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

/** Preços default (espelham platform_settings) — provisórios */
export const DEFAULT_PRICES = {
  monthlyFeeCents: 5000, // R$50 mensalidade (= e-mails)
  priceCents: 10000, // R$100 / hora
  lawyerCutCents: 8000, // R$80 ao advogado
  platformCutCents: 2000, // R$20 plataforma
  sessionMinutes: 60,
} as const;
