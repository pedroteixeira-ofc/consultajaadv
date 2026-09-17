import Link from "next/link";
export default function HomePage() {
  return <main className="min-h-screen bg-teal-50 p-8">
    <header className="mx-auto flex max-w-5xl justify-between">
      <b>ConsultaJáAdv</b><nav className="flex gap-3 text-sm">
        <Link href="/sac">SAC</Link><Link href="/adv/login">Advogados</Link><Link href="/admin/login">Admin</Link>
      </nav>
    </header>
    <section className="mx-auto max-w-5xl py-12">
      <p className="text-sm text-teal-700">CONSULTAS RÁPIDAS COM ADVOGADOS</p>
      <h1 className="my-4 text-4xl font-bold">Fale com um advogado online em minutos</h1>
      <p className="mb-8 text-lg text-slate-600">Sessões de 60 minutos. Você escolhe se a requisição é identificada ou anônima. Advogados ficam online e aceitam a fila em tempo real.</p>
      <div className="flex gap-3"><Link href="/client/register" className="rounded bg-teal-600 p-3 text-white">Sou cliente</Link><Link href="/adv/register" className="rounded bg-slate-800 p-3 text-white">Sou advogado</Link></div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <article className="rounded border bg-white p-5"><h2 className="font-semibold">Clientes</h2><p className="text-sm text-slate-600">Conta + pedido anônimo opcional. Sessão de 1 hora por R$100. Especialidade na fila; assunto só após aceite.</p></article>
        <article className="rounded border bg-white p-5"><h2 className="font-semibold">Advogados</h2><p className="text-sm text-slate-600">Cadastro (OAB), mensalidade R$50 (= e-mails) e status online. Aceitam a fila pendente. Repasse de R$80 por sessão concluída (Pix após completed).</p></article>
      </div>
    </section>
  </main>;
}
