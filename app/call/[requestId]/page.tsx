export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Shell, Card, StubNote } from "@/components/ui";
import { CallRoom } from "@/components/call-room";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { whatsappMeUrl } from "@/lib/whatsapp";

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

  const lawyer = req.lawyer_id
    ? db.lawyers.find((p) => p.id === req.lawyer_id)
    : null;
  const wa = whatsappMeUrl(lawyer?.whatsapp ?? null);

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
          role={session.role === "admin" ? "admin" : session.role}
          callStartedAt={req.call_started_at ?? req.accepted_at}
          status={req.status}
          sessionMinutes={db.platform_settings.session_duration_minutes}
          whatsappUrl={wa}
          lawyerName={lawyer?.full_name ?? null}
          lawyerOab={lawyer?.oab ?? null}
        />
        <StubNote>
          Repasse ao advogado só após o cliente confirmar o atendimento. SAC
          nesta sessão coloca o valor em HOLD para o admin. Clientes anônimos
          também confirmam pelo token da sessão.
        </StubNote>
      </Card>
    </Shell>
  );
}
