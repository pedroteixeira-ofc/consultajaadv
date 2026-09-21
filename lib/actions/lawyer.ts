"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
import { isValidWhatsApp, normalizeWhatsApp } from "@/lib/whatsapp";
import {
  expiresIn30DaysIso,
  isStubPaymentsAllowed,
  subscriptionRef,
} from "@/lib/demo";
import { createCheckout, isLivePixConfigured } from "@/lib/livepix";
import { DEFAULT_PRICES } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/admin";

export async function lawyerRegisterAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const full_name = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const oab = String(formData.get("oab") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();
  const pix_key = String(formData.get("pixKey") ?? "").trim() || null;

  if (!full_name || !email || !password || !oab || !whatsappRaw) {
    return {
      ok: false,
      error: "Preencha nome, e-mail, senha, OAB e WhatsApp.",
    };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }
  if (!isValidWhatsApp(whatsappRaw)) {
    return {
      ok: false,
      error: "WhatsApp inválido. Use DDD+número ou +55…",
    };
  }
  const whatsapp = normalizeWhatsApp(whatsappRaw);

  const password_hash = await hashPassword(password);
  const id = newId();
  const now = nowIso();

  const result = await mutateStore((d) => {
    if (d.lawyers.some((p) => p.email === email)) {
      return { ok: false as const, error: "E-mail já cadastrado." };
    }
    d.lawyers.push({
      id,
      email,
      password_hash,
      full_name,
      oab,
      whatsapp,
      pix_key,
      subscription_status: "pending",
      subscription_expires_at: null,
      verification_status: "pending",
      online: false,
      payout_balance_cents: 0,
      created_at: now,
      updated_at: now,
    });
    return { ok: true as const };
  });

  if (!result.ok) return result;

  await setSession({ role: "lawyer", sub: id, email });
  redirect("/adv/dashboard");
}

export async function lawyerLoginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Preencha e-mail e senha." };

  const db = await readStore();
  const lawyer = db.lawyers.find((p) => p.email === email);
  if (!lawyer || !(await verifyPassword(password, lawyer.password_hash))) {
    return { ok: false, error: "Credenciais inválidas." };
  }
  await setSession({ role: "lawyer", sub: lawyer.id, email: lawyer.email });
  redirect("/adv/dashboard");
}

export async function toggleOnlineAction(): Promise<ActionResult> {
  const session = await requireSession("lawyer");
  await mutateStore((db) => {
    const p = db.lawyers.find((x) => x.id === session.sub);
    if (!p) throw new Error("Advogado não encontrado");
    p.online = !p.online;
    p.updated_at = nowIso();
  });
  return { ok: true };
}

export async function acceptRequestAction(
  requestId: string
): Promise<ActionResult & { requestId?: string }> {
  const session = await requireSession("lawyer");

  const result = await mutateStore((db) => {
    const lawyer = db.lawyers.find((p) => p.id === session.sub);
    if (!lawyer) return { ok: false as const, error: "Advogado não encontrado" };
    if (lawyer.verification_status !== "approved") {
      return {
        ok: false as const,
        error:
          "Seu OAB ainda não foi aprovado pelo admin. Você não pode aceitar filas.",
      };
    }
    if (!lawyer.online) {
      return {
        ok: false as const,
        error: "Fique online para aceitar a fila.",
      };
    }
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (!req.paid_at) {
      return { ok: false as const, error: "Pedido ainda não pago." };
    }
    if (req.status !== "pending" || req.lawyer_id) {
      return {
        ok: false as const,
        error: "Pedido já foi aceito por outro advogado.",
      };
    }
    const now = nowIso();
    req.status = "accepted";
    req.lawyer_id = lawyer.id;
    req.accepted_at = now;
    req.updated_at = now;
    return { ok: true as const, requestId };
  });

  if (result.ok) {
    redirect(`/call/${requestId}`);
  }
  return result;
}

export async function lawyerCompleteSessionAction(requestId: string) {
  await requireSession("lawyer");
  const { completeConsultation } = await import("@/lib/actions/session");
  return completeConsultation(requestId, "lawyer");
}

/**
 * Assinar 30 dias (alertas de e-mail). LivePix real; stub só em DEV/DEMO.
 */
export async function startSubscriptionCheckoutAction(): Promise<
  ActionResult & { checkoutUrl?: string }
> {
  const session = await requireSession("lawyer");
  const db = await readStore();
  const lawyer = db.lawyers.find((p) => p.id === session.sub);
  if (!lawyer) return { ok: false, error: "Advogado não encontrado" };

  const amount =
    db.platform_settings.monthly_fee_cents ?? DEFAULT_PRICES.monthlyFeeCents;
  const externalId = subscriptionRef(lawyer.id);

  if (!isLivePixConfigured()) {
    if (!isStubPaymentsAllowed()) {
      return {
        ok: false,
        error: "LivePix não configurado. Defina CLIENT_ID/SECRET em produção.",
      };
    }
    // DEV/DEMO stub: activate immediately
    await mutateStore((d) => {
      const p = d.lawyers.find((x) => x.id === session.sub);
      if (!p) return;
      p.subscription_status = "active";
      p.subscription_expires_at = expiresIn30DaysIso();
      p.updated_at = nowIso();
    });
    return { ok: true, checkoutUrl: "/adv/dashboard?sub=stub" };
  }

  const checkout = await createCheckout({
    amountCents: amount,
    description: "Mensalidade ConsultaJáAdv — alertas 30 dias",
    externalId,
    returnUrl: "/adv/dashboard?sub=return",
  });
  if (!checkout.ok || !checkout.checkoutUrl) {
    return { ok: false, error: checkout.error ?? "Falha ao criar checkout" };
  }
  return { ok: true, checkoutUrl: checkout.checkoutUrl };
}

/** @deprecated use startSubscriptionCheckoutAction */
export async function activateSubscriptionStubAction(): Promise<ActionResult> {
  if (!isStubPaymentsAllowed()) {
    return {
      ok: false,
      error: "Stub de mensalidade só em development ou DEMO=1.",
    };
  }
  const session = await requireSession("lawyer");
  await mutateStore((db) => {
    const p = db.lawyers.find((x) => x.id === session.sub);
    if (!p) throw new Error("not found");
    p.subscription_status = "active";
    p.subscription_expires_at = expiresIn30DaysIso();
    p.updated_at = nowIso();
  });
  return { ok: true };
}
