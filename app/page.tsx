import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-teal-800">ConsultaJáAdv</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/sac" className="text-slate-600 hover:text-teal-700">
            SAC
          </Link>
          <Link href="/adv/login" className="text-slate-600 hover:text-teal-700">
            Advogados
          </Link>
          <Link href="/admin/login" className="text-slate-600 hover:text-teal-700">
            Admin
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-teal-700">
            Consultas rápidas com advogados
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Fale com um advogado online em minutos
          </h1>
          <p className="mb-8 text-lg text-slate-600">
            Sessões de 60 minutos. Você escolhe se a requisição é identificada
            ou anônima. Advogados ficam online e aceitam a fila em tempo real.
            Demo local sem serviços externos.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/client/register"
              className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Sou cliente
            </Link>
            <Link
              href="/adv/register"
              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Sou advogado
            </Link>
          </div>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Clientes</h2>
            <p className="text-sm text-slate-600">
              Conta + pedido anônimo opcional. R$100 / hora → R$80 para o
              advogado após a sessão. Especialidade na fila; assunto só após
              aceite.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Advogados</h2>
            <p className="text-sm text-slate-600">
              Cadastro (OAB), mensalidade R$50 (= e-mails) e status online.
              Aceitam a fila pendente — não é só e-mail. Pix só após sessão
              concluída.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
