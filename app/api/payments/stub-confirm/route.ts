import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markConsultationPaid } from "@/lib/actions/session";
import { mutateStore, nowIso, readStore } from "@/lib/store";

/**
 * Demo LivePix webhook simulator.
 * POST { "requestId": "<uuid>" } — marks consultation paid.
 * POST { "kind": "subscription", "lawyerId": "<uuid>" } — activates mensalidade.
 */
export async function POST(request: Request) {
  let body: {
    requestId?: string;
    kind?: string;
    lawyerId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (body.kind === "subscription" && body.lawyerId) {
    await mutateStore((db) => {
      const p = db.lawyers.find((x) => x.id === body.lawyerId);
      if (!p) return;
      p.subscription_status = "active";
      p.updated_at = nowIso();
    });
    return NextResponse.json({ ok: true, kind: "subscription" });
  }

  const requestId = body.requestId;
  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "requestId obrigatório" },
      { status: 400 }
    );
  }

  const session = await getSession();
  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req) {
    return NextResponse.json(
      { ok: false, error: "Pedido não encontrado" },
      { status: 404 }
    );
  }

  const clientId =
    session?.role === "client" ? session.sub : req.client_id;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Pedido sem cliente" },
      { status: 400 }
    );
  }

  const result = await markConsultationPaid(requestId, clientId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({ ok: true, requestId, paid: true });
}
