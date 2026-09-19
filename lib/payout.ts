/**
 * Payout Pix ao advogado — SOMENTE após client confirmar atendimento.
 * Sem transferência automática LivePix: credita saldo owed (pending) e
 * admin marca lote pago tipicamente nos dias 10 e 28.
 */
import { mutateStore, newId, nowIso, readStore } from "@/lib/store";
import type { PayoutBatch } from "@/lib/types";

export type PayoutInput = {
  lawyerId: string;
  consultationRequestId: string;
  amountCents: number;
  pixKey: string;
};

export type PayoutResult = {
  ok: boolean;
  payoutId?: string;
  error?: string;
};

/**
 * Credita payout_balance e registra payout pending (a pagar no lote).
 * Pré-condições: completed + attendance confirmed + eligible/released + not withheld.
 */
export async function enqueueLawyerPayout(
  input: PayoutInput
): Promise<PayoutResult> {
  console.info("[payout] enqueueLawyerPayout AFTER client confirm", {
    lawyerId: input.lawyerId,
    consultationRequestId: input.consultationRequestId,
    amountCents: input.amountCents,
  });
  return mutateStore((db) => {
    const req = db.consultation_requests.find(
      (r) => r.id === input.consultationRequestId
    );
    if (!req) return { ok: false, error: "Pedido não encontrado" };
    if (req.status !== "completed") {
      return { ok: false, error: "Sessão ainda não completed" };
    }
    if (!req.attendance_confirmed_by_client) {
      return { ok: false, error: "Cliente ainda não confirmou o atendimento" };
    }
    if (
      req.payout_release_status !== "eligible" &&
      req.payout_release_status !== "released"
    ) {
      return {
        ok: false,
        error: `Payout não liberado (status=${req.payout_release_status})`,
      };
    }
    if (req.payout_withheld) {
      return { ok: false, error: "Payout retido pelo admin" };
    }
    if (req.payout_credited) {
      return { ok: false, error: "Payout já creditado" };
    }
    const lawyer = db.lawyers.find((p) => p.id === input.lawyerId);
    if (!lawyer) return { ok: false, error: "Advogado não encontrado" };

    const payoutId = newId();
    const now = nowIso();
    db.payouts.push({
      id: payoutId,
      lawyer_id: input.lawyerId,
      consultation_request_id: input.consultationRequestId,
      amount_cents: input.amountCents,
      pix_key: input.pixKey || lawyer.pix_key || "sem-chave",
      status: "pending",
      provider_ref: null,
      payout_batch_id: null,
      created_at: now,
      paid_at: null,
    });
    lawyer.payout_balance_cents += input.amountCents;
    lawyer.updated_at = now;
    req.payout_credited = true;
    req.updated_at = now;
    return { ok: true, payoutId };
  });
}

export type OwedRow = {
  lawyerId: string;
  fullName: string;
  pixKey: string | null;
  owedCents: number;
  pendingPayoutIds: string[];
};

export async function listOwedByLawyer(): Promise<OwedRow[]> {
  const db = await readStore();
  const map = new Map<string, OwedRow>();
  for (const p of db.payouts) {
    if (p.status !== "pending") continue;
    const lawyer = db.lawyers.find((x) => x.id === p.lawyer_id);
    const row = map.get(p.lawyer_id) ?? {
      lawyerId: p.lawyer_id,
      fullName: lawyer?.full_name ?? p.lawyer_id.slice(0, 8),
      pixKey: lawyer?.pix_key ?? p.pix_key,
      owedCents: 0,
      pendingPayoutIds: [],
    };
    row.owedCents += p.amount_cents;
    row.pendingPayoutIds.push(p.id);
    map.set(p.lawyer_id, row);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
}

/** Cria lote e marca payouts pending como paid (dias 10/28). */
export async function markPayoutBatchPaid(opts: {
  label?: string;
  notes?: string;
  lawyerIds?: string[];
}): Promise<{ ok: true; batch: PayoutBatch } | { ok: false; error: string }> {
  return mutateStore((db) => {
    const now = nowIso();
    const day = new Date().getDate();
    const defaultLabel =
      day <= 15
        ? `Lote dia 10 — ${now.slice(0, 7)}`
        : `Lote dia 28 — ${now.slice(0, 7)}`;
    const filterIds = opts.lawyerIds
      ? new Set(opts.lawyerIds)
      : null;

    const pending = db.payouts.filter((p) => {
      if (p.status !== "pending") return false;
      if (filterIds && !filterIds.has(p.lawyer_id)) return false;
      return true;
    });
    if (pending.length === 0) {
      return {
        ok: false as const,
        error: "Nenhum payout pendente neste filtro.",
      };
    }

    const batchId = newId();
    let total = 0;
    for (const p of pending) {
      p.status = "paid";
      p.paid_at = now;
      p.payout_batch_id = batchId;
      p.provider_ref = p.provider_ref || `batch_${batchId.slice(0, 8)}`;
      total += p.amount_cents;
      const lawyer = db.lawyers.find((x) => x.id === p.lawyer_id);
      if (lawyer) lawyer.updated_at = now;
    }

    const batch: PayoutBatch = {
      id: batchId,
      label: opts.label?.trim() || defaultLabel,
      status: "paid",
      total_cents: total,
      notes: opts.notes?.trim() || null,
      created_at: now,
      paid_at: now,
    };
    if (!db.payout_batches) db.payout_batches = [];
    db.payout_batches.push(batch);
    return { ok: true as const, batch };
  });
}

export async function processPendingPayouts(): Promise<{ processed: number }> {
  console.info(
    "[payout] processPendingPayouts — sem transfer API; use admin lote 10/28"
  );
  return { processed: 0 };
}
