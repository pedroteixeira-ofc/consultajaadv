import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === params.requestId);
  if (!req) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const allowed =
    (session.role === "client" && req.client_id === session.sub) ||
    (session.role === "lawyer" &&
      (req.lawyer_id === session.sub || req.status === "pending")) ||
    session.role === "admin";
  if (!allowed) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json({
    id: req.id,
    status: req.status,
    paid: Boolean(req.paid_at),
    lawyer_id: req.lawyer_id,
    specialty: req.specialty,
    is_anonymous: req.is_anonymous,
    // subject_summary only after accept for lawyer/admin (and always for owner client)
    subject_summary:
      req.status !== "pending" ||
      session.role === "client" ||
      session.role === "admin"
        ? req.subject_summary
        : null,
  });
}
