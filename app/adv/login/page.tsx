export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { lawyerLoginAction } from "@/lib/actions/lawyer";

export default function AdvLoginPage() {
  return (
    <Shell title="Login advogado" backHref="/">
      <Card>
        <ActionForm action={lawyerLoginAction} submitLabel="Entrar">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Novo aqui?{" "}
          <Link href="/adv/register" className="text-teal-700 underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
