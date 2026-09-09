"use server";

import { mutateStore, nowIso } from "@/lib/store";
import { notifyActiveLawyersOfNewRequest } from "@/lib/email";
import { enqueueLawyerPayout } from "@/lib/payout";
import type { ActionResult } from "@/lib/actions/admin";

export async function markConsultationPaid(
  requestId: string,
  clientId: string
): Promise<ActionResult> {
  const result = await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.client_id !== clientId) {
      return { ok: false as const, error: "Pedido não pertence a você" };
    }
    if (req.paid_at) return { ok: true as const };
    if (req.status !== "pending") {
      return { ok: false as const, error: "Status inválido para pagamento" };
    }
    const now = nowIso();
    req.paid_at = now;
    req.updated_at = now;

    db.credits_ledger.push({
      id: crypto.randomUUID(),
      client_id: clientId,
      amount_cents: -req.price_cents,
      reason: "session_charge",
      consultation_request_id: requestId,
      created_at: now,
    });
    return { ok: true as const };
  });

  if (result.ok) {
    await notifyActiveLawyersOfNewRequest(requestId);
  }
  return result;
}

type CompletePrep =
  | { ok: false; error: string }
  | { ok: true; already: true }
  | {
      ok: true;
      already: false;
      lawyerId: string;
      amountCents: number;
      pixKey: string;
    };

export async function completeConsultation(
  requestId: string,
  by: "lawyer" | "admin" | "timer"
): Promise<ActionResult> {
  const prep: CompletePrep = await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return { ok: false as const, error: "Pedido não encontrado" };
    if (req.status === "completed") {
      return { ok: true as const, already: true as const };
    }
    if (req.status !== "accepted" && req.status !== "in_call") {
      return {
        ok: false as const,
        error: `Status ${req.status} não permite encerrar`,
      };
    }
    if (!req.lawyer_id) {
      return { ok: false as const, error: "Sem advogado atribuído" };
    }
    if (!req.paid_at) {
      return { ok: false as const, error: "Pedido não pago" };
    }
    const now = nowIso();
    if (req.status === "accepted") {
      req.call_started_at = req.call_started_at ?? now;
    }
    req.status = "completed";
    req.completed_at = now;
    req.updated_at = now;
    const lawyer = db.lawyers.find((p) => p.id === req.lawyer_id);
    return {
      ok: true as const,
      already: false as const,
      lawyerId: req.lawyer_id,
      amountCents: req.lawyer_cut_cents,
      pixKey: lawyer?.pix_key ?? "",
    };
  });

  if (!prep.ok) return prep;
  if (prep.already) return { ok: true };

  const payout = await enqueueLawyerPayout({
    lawyerId: prep.lawyerId,
    consultationRequestId: requestId,
    amountCents: prep.amountCents,
    pixKey: prep.pixKey,
  });

  if (!payout.ok) {
    console.error("[session] payout failed after complete", payout.error, by);
    return { ok: false, error: payout.error ?? "Falha no payout" };
  }
  return { ok: true };
}

/** Marca in_call quando entra na sala. */
export async function markInCallAction(requestId: string): Promise<ActionResult> {
  await mutateStore((db) => {
    const req = db.consultation_requests.find((r) => r.id === requestId);
    if (!req) return;
    if (req.status === "accepted") {
      const now = nowIso();
      req.status = "in_call";
      req.call_started_at = req.call_started_at ?? now;
      req.updated_at = now;
    }
  });
  return { ok: true };
}

export async function completeSessionUiAction(
  requestId: string
): Promise<ActionResult> {
  const { getSession } = await import("@/lib/auth");
  const { readStore } = await import("@/lib/store");
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req) return { ok: false, error: "Pedido não encontrado" };

  if (session.role === "admin") {
    return completeConsultation(requestId, "admin");
  }
  if (session.role === "lawyer") {
    if (req.lawyer_id !== session.sub) {
      return { ok: false, error: "Não é o advogado desta sessão" };
    }
    return completeConsultation(requestId, "lawyer");
  }
  if (session.role === "client") {
    if (req.client_id !== session.sub) {
      return { ok: false, error: "Não é o cliente desta sessão" };
    }
    const started = req.call_started_at
      ? new Date(req.call_started_at).getTime()
      : req.accepted_at
        ? new Date(req.accepted_at).getTime()
        : 0;
    const elapsed = Date.now() - started;
    const sessionMs =
      (db.platform_settings.session_duration_minutes || 60) * 60 * 1000;
    if (elapsed < sessionMs) {
      return {
        ok: false,
        error: "Cliente só pode encerrar após 60 minutos.",
      };
    }
    return completeConsultation(requestId, "timer");
  }
  return { ok: false, error: "Acesso negado" };
}
