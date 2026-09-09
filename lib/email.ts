/**
 * E-mail stub (Resend) — notificações opcionais.
 * Fila de advogados é ONLINE + aceitar pending, NÃO e-mail-only.
 * Mensalidade: sem subscription active → NÃO registra e-mail de nova solicitação.
 */
import { mutateStore, newId, nowIso } from "@/lib/store";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  reason?: string;
};

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
  console.info("[email stub] sendEmail", input.to, input.subject, input.reason);
  await mutateStore((db) => {
    db.email_log.push({
      id: newId(),
      to: input.to,
      subject: input.subject,
      reason: input.reason ?? "generic",
      created_at: nowIso(),
    });
  });
  return { ok: true };
}

/**
 * Avisa só advogados com mensalidade active.
 * Online sem mensalidade NÃO recebe e-mail, mas ainda pode Aceitar na fila.
 */
export async function notifyActiveLawyersOfNewRequest(requestId: string) {
  const { readStore } = await import("@/lib/store");
  const db = await readStore();
  const active = db.lawyers.filter((p) => p.subscription_status === "active");
  const req = db.consultation_requests.find((r) => r.id === requestId);
  const specialty = req?.specialty ?? "";
  for (const p of active) {
    await sendEmail({
      to: p.email,
      subject: `Nova solicitação (${specialty}) — ${requestId.slice(0, 8)}`,
      html: `<p>Há um pedido pendente pago (especialidade: ${specialty}). Entre no painel e Aceite se estiver online. Assunto só após o accept.</p>`,
      reason: "new_request_blast",
    });
  }
  if (active.length === 0) {
    console.info(
      "[email stub] no active-subscription lawyers — skipping blast for",
      requestId
    );
  }
}
