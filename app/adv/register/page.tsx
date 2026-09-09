import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function AdvRegisterPage() {
  return (
    <Shell title="Cadastro de advogado" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Após o cadastro: pagar mensalidade R$50 (LivePix depois) para receber
          e-mails, ficar <strong>online</strong> e aceitar a fila pendente —
          não é atendimento só por e-mail.
        </p>
        <form className="max-w-md">
          <Field label="Nome completo" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field label="OAB (opcional)" name="oab" placeholder="OAB/UF 000000" />
          <Field label="Chave Pix" name="pixKey" placeholder="para payout após sessão" />
          <Btn type="submit">Registrar</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/adv/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
        <StubNote>
          Stub: subscription_status=pending até pagamento LivePix da mensalidade
          (R$50 = e-mails de solicitação).
        </StubNote>
      </Card>
    </Shell>
  );
}
