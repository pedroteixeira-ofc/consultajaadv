import { NextRequest, NextResponse } from "next/server";
import { markConsultationPaid } from "@/lib/actions/session";
import { getLivePixEnv } from "@/lib/livepix";
import { mutateStore, nowIso, readStore } from "@/lib/store";

/**
 * LivePix webhook — POST /api/payments/livepix/webhook
 * Payload shape (docs): { event, resource: { id, reference, type } }
 * Also accepts { requestId } / { reference } / subscription activation fields.
 */
export async function POST(req: NextRequest) {
  const secret = getLivePixEnv().webhookSecret;
  if (secret) {
    const header =
      req.headers.get("x-livepix-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (body.kind === "subscription" && typeof body.lawyerId === "string") {
    await mutateStore((db) => {
      const p = db.lawyers.find((x) => x.id === body.lawyerId);
      if (!p) return;
      p.subscription_status = "active";
      p.updated_at = nowIso();
    });
    return NextResponse.json({ ok: true, kind: "subscription" });
  }

  const resource =
    body.resource && typeof body.resource === "object"
      ? (body.resource as Record<string, unknown>)
      : null;

  const requestId =
    (typeof body.requestId === "string" && body.requestId) ||
    (typeof body.paymentId === "string" && body.paymentId) ||
    (typeof body.reference === "string" && body.reference) ||
    (resource && typeof resource.reference === "string" && resource.reference) ||
    null;

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "requestId ou reference obrigatório" },
      { status: 400 }
    );
  }

  const db = await readStore();
  const consultation = db.consultation_requests.find((r) => r.id === requestId);
  if (!consultation) {
    return NextResponse.json(
      { ok: true, matched: false, detail: "Pedido não encontrado" },
      { status: 200 }
    );
  }
  if (!consultation.client_id) {
    return NextResponse.json(
      { ok: false, error: "Pedido sem cliente" },
      { status: 400 }
    );
  }

  const result = await markConsultationPaid(
    requestId,
    consultation.client_id
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: true, matched: true, paid: false, detail: result.error },
      { status: 200 }
    );
  }
  return NextResponse.json({ ok: true, matched: true, paid: true, requestId });
}
