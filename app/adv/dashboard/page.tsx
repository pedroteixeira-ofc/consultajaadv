export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Shell } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { LawyerDashboardClient } from "@/components/lawyer-dashboard";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdvDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "lawyer") redirect("/adv/login");

  const db = await readStore();
  const lawyer = db.lawyers.find((p) => p.id === session.sub);
  if (!lawyer) redirect("/adv/login");

  const queue = db.consultation_requests
    .filter((r) => r.status === "pending" && r.paid_at && !r.lawyer_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      created_at: r.created_at,
      price_cents: r.price_cents,
      specialty: r.specialty,
      is_anonymous: r.is_anonymous,
      // subject_summary NÃO enviado à fila (só após accept)
    }));

  return (
    <Shell
      title={`Painel — ${lawyer.full_name}`}
      backHref="/"
      right={<LogoutButton />}
    >
      <LawyerDashboardClient
        initialOnline={lawyer.online}
        subscriptionStatus={lawyer.subscription_status}
        payoutBalanceCents={lawyer.payout_balance_cents}
        queue={queue}
      />
    </Shell>
  );
}
