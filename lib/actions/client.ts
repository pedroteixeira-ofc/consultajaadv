"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
import { DEFAULT_PRICES } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/admin";

export async function clientRegisterAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const full_name = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!full_name || !email || !password) {
    return { ok: false, error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }

  const password_hash = await hashPassword(password);
  const id = newId();
  const now = nowIso();

  const result = await mutateStore((d) => {
    if (d.clients.some((c) => c.email === email)) {
      return { ok: false as const, error: "E-mail já cadastrado." };
    }
    d.clients.push({
      id,
      email,
      password_hash,
      full_name,
      credits_cents: 0,
      created_at: now,
      updated_at: now,
    });
    return { ok: true as const };
  });

  if (!result.ok) return result;

  await setSession({ role: "client", sub: id, email });
  redirect("/client/dashboard");
}

export async function clientLoginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };

  const db = await readStore();
  const client = db.clients.find((c) => c.email === email);
  if (!client || !(await verifyPassword(password, client.password_hash))) {
    return { ok: false, error: "Credenciais inválidas." };
  }
  await setSession({ role: "client", sub: client.id, email: client.email });
  redirect("/client/dashboard");
}

/**
 * Cria pedido unpaid com specialty (público) + subject_summary (privado até accept).
 * Anonimato opcional: checkbox isAnonymous.
 */
export async function createConsultationAction(
  formData: FormData
): Promise<ActionResult & { requestId?: string }> {
  const session = await requireSession("client");
  const specialty = String(formData.get("specialty") ?? "").trim();
  const subject_summary = String(formData.get("subjectSummary") ?? "").trim();
  const is_anonymous = formData.get("isAnonymous") === "on";

  if (!specialty || !subject_summary) {
    return {
      ok: false,
      error: "Especialidade e assunto são obrigatórios.",
    };
  }

  const db = await readStore();
  const settings = db.platform_settings;
  const price = settings.price_cents ?? DEFAULT_PRICES.priceCents;
  const cut = settings.lawyer_cut_cents ?? DEFAULT_PRICES.lawyerCutCents;
  const platform = settings.platform_cut_cents ?? DEFAULT_PRICES.platformCutCents;

  const id = newId();
  const now = nowIso();
  let anonymous_user_id: string | null = null;

  await mutateStore((d) => {
    if (is_anonymous) {
      anonymous_user_id = newId();
      d.anonymous_users.push({
        id: anonymous_user_id,
        session_token: `anon_${session.sub}_${Date.now()}`,
        created_at: now,
      });
    }
    d.consultation_requests.push({
      id,
      status: "pending",
      is_anonymous,
      // Mantém client_id para pagamento/standby mesmo se anônimo na fila
      client_id: session.sub,
      anonymous_user_id,
      lawyer_id: null,
      specialty,
      subject_summary,
      price_cents: price,
      lawyer_cut_cents: cut,
      platform_cut_cents: platform,
      paid_at: null,
      accepted_at: null,
      call_started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      refund_requested: false,
      refunded_at: null,
      payout_credited: false,
      created_at: now,
      updated_at: now,
    });
  });

  redirect(`/client/dashboard?pay=${id}`);
}

export async function confirmStubPaymentAction(
  requestId: string
): Promise<ActionResult> {
  const session = await requireSession("client");
  const { markConsultationPaid } = await import("@/lib/actions/session");
  const result = await markConsultationPaid(requestId, session.sub);
  if (!result.ok) return result;
  redirect(`/standby/${requestId}`);
}
