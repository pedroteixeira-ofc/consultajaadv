"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeSessionUiAction,
  markInCallAction,
} from "@/lib/actions/session";

export function CallRoom({
  requestId,
  role,
  callStartedAt,
  status,
  sessionMinutes,
  specialty,
  subjectSummary,
  isAnonymous,
}: {
  requestId: string;
  role: "client" | "lawyer" | "admin";
  callStartedAt: string | null;
  status: string;
  sessionMinutes: number;
  specialty: string;
  subjectSummary: string | null;
  isAnonymous: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sessionMs = sessionMinutes * 60 * 1000;
  const started = useMemo(
    () => (callStartedAt ? new Date(callStartedAt).getTime() : Date.now()),
    [callStartedAt]
  );

  useEffect(() => {
    if (status === "accepted") {
      markInCallAction(requestId).then(() => router.refresh());
    }
  }, [status, requestId, router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - started);
  const remaining = Math.max(0, sessionMs - elapsed);
  const canComplete =
    role === "lawyer" || role === "admin" || remaining === 0;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  if (status === "completed") {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        Sessão encerrada. Payout de R$80 creditado ao advogado (se aplicável).
      </div>
    );
  }

  return (
    <div>
      {(role === "lawyer" || role === "admin") && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            <span className="font-medium">Especialidade:</span> {specialty}
          </p>
          <p>
            <span className="font-medium">Modo:</span>{" "}
            {isAnonymous ? "anônimo" : "identificado"}
          </p>
          <p className="mt-2">
            <span className="font-medium">Assunto (após accept):</span>{" "}
            {subjectSummary || "—"}
          </p>
        </div>
      )}

      <div className="mb-6 flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Sala voz / vídeo</p>
          <p className="mt-1 text-sm text-slate-300">LiveKit stub</p>
          <p className="mt-3 font-mono text-2xl">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            restante de {sessionMinutes} min · pedido {requestId.slice(0, 8)}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      {canComplete ? (
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await completeSessionUiAction(requestId);
              if (res && !res.ok) {
                setError(res.error);
                return;
              }
              router.refresh();
            })
          }
        >
          {remaining === 0
            ? `Encerrar (${sessionMinutes} min)`
            : "Encerrar sessão"}
        </button>
      ) : (
        <p className="text-sm text-slate-500">
          Aguarde o advogado encerrar, ou o timer de {sessionMinutes} min.
        </p>
      )}
    </div>
  );
}
