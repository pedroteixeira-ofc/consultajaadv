export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Shell, Card, StubNote } from "@/components/ui";
import { CallRoom } from "@/components/call-room";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { createRoomToken } from "@/lib/livekit";

export default async function CallPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { requestId } = params;
  const session = await getSession();
  if (!session) redirect("/");

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req) redirect("/");

  const allowed =
    (session.role === "client" && req.client_id === session.sub) ||
    (session.role === "lawyer" && req.lawyer_id === session.sub) ||
    session.role === "admin";
  if (!allowed) redirect("/");

  if (req.status === "pending") {
    redirect(
      session.role === "client" ? `/standby/${requestId}` : "/adv/dashboard"
    );
  }

  const token = await createRoomToken({
    requestId,
    identity: session.sub,
    name: session.email,
  });

  const role =
    session.role === "admin"
      ? "admin"
      : session.role === "lawyer"
        ? "lawyer"
        : "client";

  return (
    <Shell
      title="Consulta em andamento"
      backHref={
        session.role === "lawyer"
          ? "/adv/dashboard"
          : session.role === "admin"
            ? "/admin"
            : "/client/dashboard"
      }
    >
      <Card>
        <CallRoom
          requestId={requestId}
          role={role}
          callStartedAt={req.call_started_at ?? req.accepted_at}
          status={req.status}
          sessionMinutes={db.platform_settings.session_duration_minutes}
          specialty={req.specialty}
          subjectSummary={req.subject_summary}
          isAnonymous={req.is_anonymous}
        />
        <p className="mt-4 text-xs text-slate-400">
          LiveKit room: {token.roomName} (token stub)
        </p>
        <StubNote>
          Encerrar → status completed → payout R$80 no saldo do advogado.
          Assunto liberado ao advogado após o accept.
        </StubNote>
      </Card>
    </Shell>
  );
}
