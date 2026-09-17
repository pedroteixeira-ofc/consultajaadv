"use server";

import { redirect } from "next/navigation";
import { setSession, requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { mutateStore, readStore, newId, nowIso } from "@/lib/store";
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
  const pix_key = String(formData.get("pixKey") ?? "").trim() || null;

  if (!full_name || !email || !password || !oab) {
    return { ok: false, error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Senha deve ter ao menos 6 caracteres." };
  }

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
      pix_key,
      subscription_status: "pending",
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

/** Demo: ativar mensalidade stub (sem LivePix real). */
export async function activateSubscriptionStubAction(): Promise<ActionResult> {
  const session = await requireSession("lawyer");
  await mutateStore((db) => {
    const p = db.lawyers.find((x) => x.id === session.sub);
    if (!p) throw new Error("not found");
    p.subscription_status = "active";
    p.updated_at = nowIso();
  });
  return { ok: true };
}
