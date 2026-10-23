# Contrato da API: Demo Funcional

Todas as respostas são JSON, exceto o CSV. Os erros seguem o formato `{ "error": "<mensagem em PT-BR>" }`, com os códigos 400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado) e 409 (conflito; corpo `{ error, conflict: { id, title, start_time, end_time } }`).

Legenda: 🌐 público · 🔑 autenticado · 🛡️ somente ADMIN

## Autenticação

| Método | Rota | Acesso | Corpo / Query | Resposta |
|---|---|---|---|---|
| POST | `/api/auth/login` | 🌐 | `{ email, password }` | `{ user }` + cookie `session` |
| POST | `/api/auth/logout` | 🔑 | — | `{ message }` |
| GET | `/api/auth/me` | 🔑 | — | `{ user }` |
| POST | `/api/auth/forgot-password` | 🌐 | `{ email }` | `{ message }` (sempre igual; **sem token**) |
| POST | `/api/auth/reset-password` | 🌐 | `{ token, newPassword }` | `{ message }` / 400 |

## Metadados (formulário)

| Método | Rota | Acesso | Resposta |
|---|---|---|---|
| GET | `/api/meta/courses` | 🔑 | `[{ id, name, code, cost_center }]` |
| GET | `/api/meta/themes` | 🔑 | `[{ id, name }]` |
| GET | `/api/meta/locations` | 🔑 | `[{ id, name, capacity, description, resource_ids: number[] }]` |
| GET | `/api/meta/resources` | 🔑 | `[{ id, name, description }]` |

## Eventos

| Método | Rota | Acesso | Regras |
|---|---|---|---|
| GET | `/api/public/events` | 🌐 | APROVADO na janela de 3 meses (inalterado) |
| GET | `/api/events?status=` | 🔑 | SOLICITANTE: só os próprios; ADMIN: todos. Inclui `theme_name`, `course_name`, `location_name` |
| GET | `/api/events/counts` | 🛡️ | `{ RASCUNHO: n, AGUARDANDO_APROVACAO: n, ... }` |
| GET | `/api/events/:id` | 🔑 | Autor ou ADMIN. Inclui `resource_ids` e `audit: [{ action, user_name, from_status, to_status, comment, created_at }]` |
| POST | `/api/events` | 🔑 | Cria RASCUNHO. `submit: true` no corpo envia direto (valida campos e conflito). `status` no corpo é ignorado |
| PUT | `/api/events/:id` | 🔑 | Edita campos. Autor: RASCUNHO, REJEITADO, AGUARDANDO (revalida). ADMIN: AGUARDANDO, APROVADO (revalida conflito). Demais: 403 |
| PUT | `/api/events/:id/submit` | 🔑 | Autor; RASCUNHO ou REJEITADO → AGUARDANDO (valida campos e conflito) |
| PUT | `/api/events/:id/cancel` | 🔑 | Autor: AGUARDANDO → CANCELADO. ADMIN: AGUARDANDO ou APROVADO → CANCELADO |
| PUT | `/api/events/:id/approve` | 🛡️ | AGUARDANDO → APROVADO (revalida conflito) |
| PUT | `/api/events/:id/reject` | 🛡️ | AGUARDANDO → REJEITADO; `{ rejection_reason }` obrigatório |
| DELETE | `/api/events/:id` | 🔑 | Autor; somente RASCUNHO |

Campos do corpo de evento: `title, theme_id, course_id, event_date, start_time, end_time, location_id, resource_ids[], speaker, target_audience, justification, objective, requester_name, needs_ceremonial, needs_certificates, observations`.
Campos derivados no servidor: `cost_center` (do curso), `realization` (nome do curso), `user_id` (sessão) e `status`.

## Cadastros (CRUD) — 🛡️

Mesmo padrão para `users`, `courses`, `themes`, `locations` e `resources`:

| Método | Rota | Observações |
|---|---|---|
| GET | `/api/admin/<entidade>` | `users` nunca retorna `password_hash` |
| POST | `/api/admin/<entidade>` | `users`: `{ name, email, password, role, course_id }`; e-mail duplicado → 409 |
| PUT | `/api/admin/<entidade>/:id` | `users`: `password` opcional (redefine). `locations`: aceita `resource_ids[]` |
| DELETE | `/api/admin/<entidade>/:id` | 409 se referenciado por eventos (ou se for o próprio admin logado) |

## Relatórios e e-mail — 🛡️

| Método | Rota | Query | Resposta |
|---|---|---|---|
| GET | `/api/admin/reports` | `start_date, end_date, course_id, theme_id` (todos opcionais) | `[{ title, event_date, start_time, end_time, theme_name, course_name, cost_center, location_name, requester_name, status }]` ordenado por data e hora |
| GET | `/api/admin/reports.csv` | mesmos filtros | `text/csv; charset=utf-8`, BOM, `;`, `attachment; filename="relatorio-eventos.csv"` |
| GET | `/api/admin/outbox` | — | últimos 20 e-mails |
