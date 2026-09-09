/**
 * Payout Pix ao advogado — SOMENTE após sessão completed / timer 60min.
 * Nunca pagar no accept nem no pending.
 */

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
 * Credita payout_balance e registra payout pendente.
 * Chamar apenas quando consultation_requests.status = 'completed'.
 */
export async function enqueueLawyerPayout(
  input: PayoutInput
): Promise<PayoutResult> {
  // TODO: gravar em `payouts`, debitar lógica de saldo, disparar Pix (LivePix)
  // IMPORTANTE: só após completed / 60min timer
  console.info("[payout stub] enqueueLawyerPayout AFTER completed", input);
  return {
    ok: true,
    payoutId: `stub_payout_${Date.now()}`,
  };
}

export async function processPendingPayouts(): Promise<{ processed: number }> {
  console.info("[payout stub] processPendingPayouts");
  return { processed: 0 };
}
