export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { lawyerRegisterAction } from "@/lib/actions/lawyer";

export default function AdvRegisterPage() {
  return (
    <Shell title="Cadastro de advogado" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Após o cadastro: fique <strong>online</strong> e aceite a fila
          pendente. Mensalidade libera e-mail de novas solicitações — online
          sem mensalidade ainda pode Aceitar (após OAB aprovada). WhatsApp é
          obrigatório (sala usa wa.me).
        </p>
        <ActionForm action={lawyerRegisterAction} submitLabel="Registrar">
          <Field label="Nome completo" name="fullName" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field label="OAB" name="oab" placeholder="OAB/UF 000000" required />
          <Field
            label="WhatsApp"
            name="whatsapp"
            placeholder="11999999999 ou +5511999999999"
            required
          />
          <Field
            label="Chave Pix"
            name="pixKey"
            placeholder="para payout após confirmação do cliente"
          />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/adv/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
