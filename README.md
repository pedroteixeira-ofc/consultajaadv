# ConsultaJáAdv

**Consultas rápidas com advogados** — marketplace de sessões curtas (60 min) com advogados online.

> Nome: ConsultaJáAdv.  
> Clone adaptado de ConsultaJáPsico (psicólogos → advogados, CRP → OAB).

## Visão (MVP)

- **Advogados**: registram-se, pagam mensalidade (LivePix depois), ficam **online** e **aceitam a fila pendente** (não é atendimento só por e-mail).
- **Anonimato OPCIONAL**: o cliente escolhe, na requisição, se quer ser **identificado** ou **anônimo**.
- **Mensalidade R$50/mês**: com assinatura ativa o advogado recebe **e-mails** de novas solicitações; sem mensalidade = sem e-mail. **Online** ainda pode **Aceitar** + payout após sessão concluída.
- **Preço provisório**: R$100/hora → **R$80** ao advogado + **R$20** plataforma (Pedro pode ajustar depois).
- **Visibilidade na fila**:
  - **Especialidade** (`specialty`): visível **ANTES** do accept.
  - **Assunto / resumo** (`subject_summary`): visível **SOMENTE APÓS** o accept.
- **SAC**: formulário público geral; **somente admin** lê.
- **Admin**: primeiro acesso cria usuário + senha; segundo signup de admin = erro.
- **Payout Pix** ao advogado **somente depois** de sessão `completed` / timer de 60 min.

## Stack (fase 1 — skeleton)

- Next.js 14 (App Router) + TypeScript + Tailwind
- Schema Supabase em `supabase/schema.sql` (projeto live ainda não obrigatório)
- LivePix / LiveKit / Resend: **stubs** em `lib/` + `.env.example` (sem chaves reais)

## Como rodar

```bash
cd consultajaadv
cp .env.example .env.local   # opcional nesta fase
npm install
npm run dev                  # http://localhost:3000
npm run build                # deve passar em verde
```

## Variáveis de ambiente

Veja `.env.example`:

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_APP_URL` | URL do app |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (próxima fase) |
| `LIVEPIX_*` | Pagamentos (stub) |
| `LIVEKIT_*` / `NEXT_PUBLIC_LIVEKIT_URL` | Sala voz/vídeo (stub) |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail (stub; fila **não** é e-mail-only) |

**Não commitar segredos.**

## Rotas (skeleton)

| Rota | Descrição |
|------|-----------|
| `/` | Landing — consultas rápidas com advogados |
| `/admin/setup` | Primeiro admin |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin (stub) |
| `/admin/sac` | Lista SAC (só admin) |
| `/adv/register` | Cadastro advogado |
| `/adv/login` | Login advogado |
| `/adv/dashboard` | Toggle online + fila pendente (specialty pública) |
| `/client/register` | Cadastro cliente |
| `/client/login` | Login cliente |
| `/client/dashboard` | Créditos + pedido (identificado ou anônimo) |
| `/standby/[requestId]` | Sala de espera |
| `/call/[requestId]` | Stub da chamada (LiveKit depois) |
| `/sac` | Formulário público SAC |

## Schema (tabelas)

Em `supabase/schema.sql`:

- `admins` — no máximo 1 (app + índice único)
- `lawyers` — perfil (OAB), `subscription_status`, `online`, `payout_balance_cents`
- `clients` — identificados + créditos
- `anonymous_users` — suporte a pedido anônimo opcional
- `consultation_requests` — `pending|accepted|in_call|completed|cancelled`; `is_anonymous`; `specialty` (público); `subject_summary` (privado até accept); `lawyer_id` nullable até accept
- `credits_ledger`
- `sac_tickets` — admin-only na leitura
- `platform_settings` — mensalidade 5000, preço 10000/hora, corte advogado 8000, plataforma 2000, sessão 60 min
- `payouts` — histórico Pix pós-`completed`

## Stub vs. próximo

| Já no skeleton | Próximo |
|----------------|---------|
| UI PT + rotas `/adv/*` | Auth real + middleware |
| Schema SQL | Projeto Supabase + RLS |
| `lib/livepix.ts` | Checkout/webhooks LivePix |
| `lib/livekit.ts` | Tokens e room reais |
| `lib/email.ts` | Resend (avisos; fila continua online) |
| `lib/payout.ts` | Pix após `completed` |
| Forms sem persistência | Server Actions / API |

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servir build
- `npm run lint` — ESLint

## Posicionamento

ConsultaJáAdv = **consultas rápidas com advogados**. Não é assessoria jurídica contínua neste MVP.

## Deploy

Produção será um **novo projeto Vercel** (ConsultaJáAdv) — **não** reutilizar brazil-likes-ig / BrazilLikesIG nem ConsultaJáPsico.

## Regras de negócio (MVP)

### Mensalidade do advogado
- **Sem mensalidade:** não recebe e-mail de novas solicitações.
- **Online no dashboard:** pode **Aceitar** pedidos pendentes mesmo sem mensalidade e recebe o repasse após os 60 min.
- A plataforma lucra no split da consulta (ex.: R$20). Mensalidade paga = prioridade por e-mail.

### Visibilidade do pedido
- Na fila pendente o advogado vê **especialidade** (e se é anônimo/identificado).
- O **assunto / resumo** só aparece **depois** de Aceitar.

### Anonimato
- Opcional **neste produto**: o cliente marca identificado ou anônimo ao solicitar.
