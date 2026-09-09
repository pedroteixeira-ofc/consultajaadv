import Link from "next/link";
import { Shell, Card, Btn, StubNote, Field } from "@/components/ui";

export default function ClientDashboardPage() {
  return (
    <Shell title="Minha conta" backHref="/">
      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">Créditos</h2>
        <p className="text-3xl font-bold text-teal-700">R$ 0,00</p>
        <p className="mt-2 text-sm text-slate-600">
          Cada sessão de 60 min custa R$100 (provisório; débito de créditos).
        </p>
        <div className="mt-4">
          <Btn>Comprar créditos (LivePix stub)</Btn>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Iniciar consulta</h2>
        <p className="mb-3 text-sm text-slate-600">
          Informe a especialidade (visível na fila) e o assunto (só após o
          advogado aceitar). Anonimato é opcional.
        </p>
        <form className="max-w-md">
          <Field
            label="Especialidade"
            name="specialty"
            placeholder="Ex.: Trabalhista, Família, Consumidor"
            required
          />
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Assunto / resumo (privado até o aceite)
            </span>
            <textarea
              name="subjectSummary"
              required
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Descreva brevemente o que precisa"
            />
          </label>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isAnonymous" className="rounded border-slate-300" />
            Solicitar de forma anônima
          </label>
          <Btn type="submit">Pedir consulta (stub)</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Problemas?{" "}
          <Link href="/sac" className="text-teal-700 underline">
            Abrir SAC
          </Link>
        </p>
        <StubNote>
          Stub: specialty pública na fila; subject_summary só após Aceitar.
          Payout ao advogado só após completed.
        </StubNote>
      </Card>
    </Shell>
  );
}
