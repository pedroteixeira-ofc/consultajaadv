"use client";

import { useState } from "react";
import { Shell, Card, StubNote } from "@/components/ui";

/** Stub: specialty pública; subject_summary bloqueado até accept */
const PENDING = [
  {
    id: "req-stub-1",
    kind: "identified" as const,
    specialty: "Trabalhista",
    subjectSummary: "Rescisão e verbas pendentes",
    since: "agora",
  },
  {
    id: "req-stub-2",
    kind: "anonymous" as const,
    specialty: "Família",
    subjectSummary: "Dúvida sobre pensão alimentícia",
    since: "2 min",
  },
];

export default function AdvDashboardPage() {
  const [online, setOnline] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);

  return (
    <Shell title="Painel do advogado" backHref="/">
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Status online</h2>
            <p className="text-sm text-slate-600">
              Você precisa estar online e aceitar a fila pendente. Mensalidade
              ativa = recebe e-mails; sem mensalidade ainda pode Aceitar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOnline((v) => !v)}
            className={`inline-flex min-w-[140px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
              online
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {online ? "Ficar offline" : "Ficar online"}
          </button>
        </div>
        <p className="mt-3 text-sm">
          Agora:{" "}
          <span
            className={
              online ? "font-semibold text-teal-700" : "text-slate-500"
            }
          >
            {online ? "ONLINE" : "offline"}
          </span>
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Fila pendente</h2>
        <ul className="divide-y divide-slate-100">
          {PENDING.map((r) => {
            const accepted = acceptedIds.includes(r.id);
            return (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p>
                      Pedido <code>{r.id}</code> ·{" "}
                      <span className="font-medium text-teal-800">
                        {r.specialty}
                      </span>{" "}
                      · {r.kind === "anonymous" ? "anônimo" : "identificado"} ·{" "}
                      {r.since}
                    </p>
                    {accepted ? (
                      <p className="mt-1 text-slate-700">
                        Assunto:{" "}
                        <span className="font-medium">{r.subjectSummary}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-400 italic">
                        Assunto / resumo bloqueado até Aceitar
                      </p>
                    )}
                  </div>
                  {!accepted ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAcceptedIds((ids) =>
                          ids.includes(r.id) ? ids : [...ids, r.id]
                        )
                      }
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      Aceitar
                    </button>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Aceito
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <StubNote>
          Stub de fila: <strong>especialidade</strong> visível antes do accept;
          <strong> assunto</strong> só depois. Payout Pix após completed / timer
          60 min (<code>lib/payout.ts</code>).
        </StubNote>
      </Card>
    </Shell>
  );
}
