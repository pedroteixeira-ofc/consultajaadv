# ConsultaJáAdv

**Consultas rápidas com advogados** — marketplace de sessões curtas (60 min) com advogados online.

> Nome: ConsultaJáAdv.  
> Clone adaptado de ConsultaJáPsico (psicólogos → advogados, CRP → OAB).

## Visão (MVP)

- **Advogados**: registram-se, (opcional) mensalidade R$50, ficam **online** e **aceitam a fila pendente**.
- **Anonimato OPCIONAL**: o cliente escolhe, na requisição, se quer ser **identificado** ou **anônimo**.
- **Mensalidade R$50/mês**: com assinatura ativa o advogado recebe **e-mails** de novas solicitações; sem mensalidade = sem e-mail. **Online** ainda pode **Aceitar** + payout após sessão concluída.
- **Preço provisório**: R$100/hora → **R$80** ao advogado + **R$20** plataforma.
- **Visibilidade na fila**:
  - **Especialidade** (`specialty`): visível **ANTES** do accept.
  - **Assunto / resumo** (`subject_summary`): visível **SOMENTE APÓS** o accept.
- **SAC**: formulário público; **somente admin** lê.
- **Admin**: primeiro acesso cria usuário + senha; segundo signup de admin = erro.
- **Payout Pix** ao advogado **somente depois** de sessão `completed` / timer 60 min / Encerrar.

## Stack (fase 2 — usable local demo)

- Next.js 14 (App Router) + TypeScript + Tailwind
- Persistência **local JSON** em `data/store.json` (zero-config). Interface em `lib/store` pronta para trocar.
- Schema Supabase em `supabase/schema.sql` + stub client em `lib/supabase.ts` quando env estiver setado.
- Auth: cookies assinados (**jose**, cookie `cja_session`) + senhas **bcryptjs**.
- LivePix / LiveKit / Resend: stubs; pagamento demo via `POST /api/payments/stub-confirm`.

## Como rodar

```bash
cd consultajaadv
cp .env.example .env.local   # opcional; SESSION_SECRET recomendado
npm install
npm run dev                  # http://localhost:3000
npm run build                # deve passar em verde
```

Dados locais ficam em `data/store.json` (gitignored). Apague o arquivo para resetar o demo.

## Demo walkthrough (sem serviços externos)

Use **duas janelas** (ou perfis) do navegador — um para advogado, um para cliente. Admin pode ser a mesma ou outra.

1. **Admin bootstrap**  
   Abra `/admin/setup` → e-mail + senha → cria o único admin e entra em `/admin`.  
   Tentar `/admin/setup` de novo redireciona / segundo create falha.

2. **Advogado**  
   `/adv/register` → nome, e-mail, senha, OAB, Pix → dashboard.  
   Clique **Ficar online**. (Mensalidade pode ficar `pending`; ainda assim pode Aceitar.)

3. **Cliente**  
   `/client/register` → dashboard → preencha **especialidade** + **assunto**, opcionalmente marque **anônimo** → **Pedir consulta** → **Confirmar pagamento (stub)** → `/standby/[id]`.

4. **Aceite**  
   No painel do advogado, a fila mostra **especialidade** (e anônimo/identificado) — **sem** o assunto → **Aceitar** (first-wins) → ambos vão para `/call/[id]` onde o assunto aparece.

5. **Encerrar → payout**  
   Advogado (ou admin) clica **Encerrar sessão** (ou aguarde 60 min).  
   Status `completed` → saldo payout do advogado **+ R$80**.

6. **SAC**  
   `/sac` envia ticket → aparece em `/admin/sac`.

7. **Mensalidade / e-mail**  
   Sem `subscription_status=active`, o stub **não** registra e-mail de nova solicitação (`data/store.json` → `email_log`).  
   No dashboard do advogado: “(demo) Ativar mensalidade stub” → próximos pagamentos geram log de e-mail. Online continua podendo Aceitar.

8. **Segundo admin**  
   Com admin já existente, novo create em setup é bloqueado.

### API de pagamento stub

```bash
curl -X POST http://localhost:3000/api/payments/stub-confirm \
  -H 'content-type: application/json' \
  -d '{"requestId":"<uuid>"}'
```

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Uso |
|----------|-----|
| `SESSION_SECRET` | Assinatura do cookie `cja_session` |
| `NEXT_PUBLIC_APP_URL` | URL do app |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (opcional) |
| `LIVEPIX_*` | Pagamentos (stub + stub-confirm) |
| `LIVEKIT_*` / `NEXT_PUBLIC_LIVEKIT_URL` | Sala voz/vídeo (stub) |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail (stub; fila **não** é e-mail-only) |

**Não commitar segredos.**

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Landing |
| `/admin/setup` | Primeiro admin (só se nenhum existir) |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin |
| `/admin/sac` | Lista SAC |
| `/adv/register` · `/adv/login` · `/adv/dashboard` | Advogado |
| `/client/register` · `/client/login` · `/client/dashboard` | Cliente |
| `/standby/[requestId]` | Espera (polling) |
| `/call/[requestId]` | Chamada stub + Encerrar (+ assunto após accept) |
| `/sac` | Formulário público SAC |
| `POST /api/payments/stub-confirm` | Simula webhook LivePix |
| `GET /api/requests/[id]/status` | Status para polling |

## Schema (tabelas)

Em `supabase/schema.sql` (espelhado no JSON store):

- `admins` — no máximo 1
- `lawyers` — OAB, `subscription_status`, `online`, `payout_balance_cents`
- `clients`
- `anonymous_users` — suporte a pedido anônimo opcional
- `consultation_requests` — `pending|accepted|in_call|completed|cancelled`; `is_anonymous`; `specialty` (público); `subject_summary` (privado até accept); `lawyer_id` nullable até accept
- `credits_ledger`, `sac_tickets`, `platform_settings`, `payouts`

## Regras de negócio (MVP)

### Mensalidade do advogado
- **Sem mensalidade:** não recebe e-mail de novas solicitações.
- **Online no dashboard:** pode **Aceitar** pedidos pendentes mesmo sem mensalidade e recebe o repasse após completed.
- Lucro plataforma = split da consulta (R$20). Mensalidade = prioridade por e-mail.

### Visibilidade do pedido
- Na fila pendente o advogado vê **especialidade** (e se é anônimo/identificado).
- O **assunto / resumo** só aparece **depois** de Aceitar.

### Anonimato
- Opcional **neste produto**: o cliente marca identificado ou anônimo ao solicitar.

### Payout
- Nunca no accept/pending. Só após `completed` (botão Encerrar, admin, ou timer 60 min).

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servir build
- `npm run lint` — ESLint

## Deploy

Produção será um **novo projeto Vercel** (ConsultaJáAdv) — **não** reutilizar brazil-likes-ig / BrazilLikesIG nem ConsultaJáPsico.
