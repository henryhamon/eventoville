# Tasks: Demo Funcional do Sistema de Gestão de Eventos Institucionais

**Input**: documentos em `/specs/006-demo-funcional/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)

**Tests**: não foram pedidos testes automatizados; a validação é feita por `scripts/smoke.sh` e pelo [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1–US7)

## Ordem de entrega (prazo 18h45)

Cada marco deixa a demo apresentável. Se o tempo acabar, congele no último marco concluído.

| Marco | Fases | O que a banca vê |
|---|---|---|
| **M1** | 1, 2, 3 | Identidade Univille, login/logout, sessão sobrevive a F5 |
| **M2** | 4, 5 | Solicitante cria, envia e é bloqueado por conflito |
| **M3** | 6 | Admin aprova → publicação imediata → edita → F5 (**roteiro essencial completo**) |
| **M4** | 7, 8 | Cadastros e relatórios com CSV |
| **M5** | 9, 10 | Recuperação de senha, README e polimento |

---

## Phase 1: Setup

- [x] T001 Corrigir migração das colunas de `events` em `db.ts` (`migrateDatabase`)
- [x] T002 Ignorar `status` do cliente no `POST /api/events` e validar o reject em `server.ts`
- [x] T003 [P] Adicionar `"db:reset"` em `package.json` e criar `scripts/reset-db.ts` (pare o servidor antes)
- [x] T004 [P] Criar `src/api.ts` com `api(path, opts)` (JSON, `credentials: 'include'`, lança `Error(body.error)`)

---

## Phase 2: Foundational (bloqueia todas as histórias)

- [x] T005 Estender `migrateDatabase()` em `db.ts`: `courses.cost_center`, tabelas `location_resources`, `sessions`, `event_audit` e `email_outbox` (ver data-model.md)
- [x] T006 Substituir o `Map` de sessões por `sessions` no SQLite em `server.ts` (`createSession`, `getSession`, `deleteSession`), com cookie `sameSite: 'lax'`
- [x] T007 Reescrever `requireAuth`/`requireAdmin` em `server.ts` para ler a sessão do banco e anexar `{ userId, role, name }`
- [x] T008 Criar helpers em `server.ts`: `checkConflict` (retorna o evento conflitante), `validateForSubmit(data)` (FR-016), `validateResources(locationId, ids)` (FR-015), `logAudit(eventId, userId, action, from, to, comment)` e `deriveCourseFields(courseId)` (`cost_center`, `realization`)
- [x] T009 Reescrever o seed em `db.ts` conforme data-model.md §Seed: gatilho "sem usuários", datas formatadas em horário local, todos os estados, par de conflito, recursos por local e auditoria inicial
- [x] T010 Corrigir `getPublicEvents` em `db.ts` para calcular a janela com datas locais (sem `toISOString`)
- [x] T011 Proteger `/api/meta/*` com `requireAuth` e incluir `resource_ids` em `/api/meta/locations` e `cost_center` em `/api/meta/courses`

**Checkpoint**: `npm run db:reset && npm run dev` sobe com o seed completo; as sessões persistem após reiniciar.

---

## Phase 3: US1 — Identidade e acesso (P1) 🎯 M1

- [x] T012 [P] [US1] Adicionar a logo em `public/univille-logo.*` e criar `src/components/Header.tsx` (logo + "Sistema de Gestão de Eventos Institucionais" + subtítulo "Univille")
- [x] T013 [US1] Usar `Header` em `PublicPortal.tsx`, remover o botão "Criar Conta" e trocar o `<title>` em `index.html`
- [x] T014 [US1] Reescrever `src/App.tsx`: signal `route` a partir de `location.hash`, signal `user` carregado por `GET /api/auth/me` no `onMount` e guarda que redireciona por perfil
- [x] T015 [P] [US1] Criar `src/components/Login.tsx` com o visual do mock (cartão branco, botão forest), mensagem de erro e link "Esqueci minha senha"; após o login, ir para `#/minhas` (SOLICITANTE) ou `#/admin` (ADMIN) — *o link "Esqueci minha senha" fica para a T039*
- [x] T016 [P] [US1] Criar `src/components/Shell.tsx`: sidebar do mock com logo, itens por perfil (Solicitante: Minhas Solicitações, Nova Solicitação; Admin: Solicitações, Cadastros, Relatórios, Caixa de saída), avatar com iniciais, "Ver agenda pública" e "Sair" — *Cadastros, Relatórios e Caixa de saída entram no menu com as T034, T036 e T038*
- [x] T017 [US1] Ligar o botão "Entrar" do portal a `#/login`; mostrar "Ir para o painel" quando já autenticado

**Checkpoint M1**: login, logout e F5 mantêm a sessão; o Solicitante não acessa `#/admin`.

---

## Phase 4: US2 — Solicitante cria e acompanha (P1) M2

- [x] T018 [US2] Em `server.ts`, `POST /api/events`: criar RASCUNHO (campos opcionais exceto título); com `submit: true`, validar e enviar; aplicar campos derivados, validar recursos e auditar `CRIADO`/`ENVIADO`
- [x] T019 [US2] Em `server.ts`, `GET /api/events/:id` (autor ou admin) com `resource_ids` e `audit`; `GET /api/events?status=` com joins de nomes
- [x] T020 [US2] Em `server.ts`, `PUT /api/events/:id` com a matriz de permissões do data-model, revalidação quando AGUARDANDO ou APROVADO e auditoria `EDITADO`
- [x] T021 [US2] Em `server.ts`, `PUT /api/events/:id/submit` (aceita RASCUNHO e REJEITADO, valida campos e conflito, limpa `rejection_reason`) e `PUT /api/events/:id/cancel` (regras por perfil)
- [x] T022 [P] [US2] Criar `src/components/StatusBadge.tsx` (Rascunho: cinza; Aguardando: âmbar/cream; Rejeitado: rose; Aprovado: mint/forest; Cancelado: cinza riscado)
- [x] T023 [US2] Criar `src/components/EventForm.tsx`: todos os campos do FR-011 em grid de 2 colunas; Centro de Custo somente leitura derivado do curso; checkboxes de recursos filtrados pelo local; toggles Sim/Não; botões "Guardar Rascunho" e "Enviar para Aprovação"; erros de campo e banner de conflito
- [x] T024 [US2] Modo edição do `EventForm` (`#/editar/:id`): carrega o evento, mostra a justificativa de rejeição em destaque e desabilita tudo se o usuário não puder editar
- [x] T025 [US2] Criar `src/components/MyRequests.tsx`: tabela com Evento, Data, Horário, Local, Estado e Ações (Editar, Enviar, Cancelar, Eliminar, conforme o estado) e o motivo de rejeição expansível

---

## Phase 5: US3 — Conflito de agenda (P1) M2

- [x] T026 [US3] Garantir que a resposta 409 inclua `conflict { title, start_time, end_time }` em submit, POST com submit, PUT e approve
- [x] T027 [US3] Rejeitar `end_time <= start_time` em todas as rotas que validam
- [x] T028 [US3] Exibir no `EventForm` o banner "Conflito de agenda com '<título>' (<início>–<fim>) neste local" a partir do 409

**Checkpoint M2**: roteiro do quickstart, passos 2 a 4.

---

## Phase 6: US4 — Admin analisa, aprova e publica (P1) 🎯 M3

- [x] T029 [US4] Em `server.ts`, `GET /api/events/counts` e auditoria em approve e reject (motivo no `comment`)
- [x] T030 [US4] Criar `src/components/AdminQueue.tsx`: chips de filtro por estado com contadores (padrão do mock "Aguardando aprovação · N pendentes"), lista de solicitações com Solicitante, Curso, Local, Data e Estado
- [x] T031 [US4] Detalhe do pedido em painel lateral ou modal: todos os campos, recursos, Sim/Não e linha do tempo de auditoria; ações Aprovar, Rejeitar (modal com textarea obrigatória), Editar (abre `EventForm` em modo admin) e Cancelar (para APROVADO)
- [x] T032 [US4] Após aprovar ou cancelar, mostrar o toast "Publicado na agenda pública" ou "Removido da agenda pública" com link para `#/`

**Checkpoint M3**: roteiro essencial completo (quickstart, passos 1 a 7).

---

## Phase 7: US5 — Cadastros (P2) M4

- [x] T033 [US5] Em `server.ts`, CRUD genérico `/api/admin/{users,courses,themes,locations,resources}` conforme o contrato (hash de senha, e-mail duplicado → 409, remoção referenciada → 409, `resource_ids` em locations, sem `password_hash` nas respostas)
- [x] T034 [US5] Criar `src/components/AdminCatalog.tsx`: abas por entidade, tabela e formulário inline de criar/editar, confirmação ao remover; aba Locais com checkboxes de recursos; aba Usuários com seletor de perfil e campo de senha

---

## Phase 8: US6 — Relatórios e CSV (P2) M4

- [x] T035 [US6] Em `server.ts`, função `queryReport(filters)` mais `GET /api/admin/reports/events` e `GET /api/admin/reports/events.csv` (BOM, `;`, aspas escapadas, cabeçalho em PT-BR igual às colunas da tabela)
- [x] T036 [US6] Criar `src/components/Reports.tsx`: filtros Data Inicial, Data Final, Curso e Tema; botão "Filtrar"; tabela com as 10 colunas; contador de registros; "Exportar CSV" via `window.location` para `/api/admin/reports/events.csv?<filtros aplicados>`

---

## Phase 9: US7 — Recuperação de senha (P3) M5

- [ ] T037 [US7] Em `server.ts`, `forgot-password` deixa de retornar o token, grava em `email_outbox` e registra o link no log; `reset-password` valida o tamanho mínimo da senha e invalida as sessões do usuário
- [ ] T038 [US7] Em `server.ts`, `GET /api/admin/outbox`; em `Shell`/`AdminQueue`, aba "Caixa de saída" listando os e-mails com o link clicável
- [ ] T039 [US7] Em `Login.tsx`, telas "Esqueci minha senha" (`#/esqueci`) e "Redefinir senha" (`#/redefinir/:token`)

---

## Phase 10: Polish

- [x] T040 [P] Criar `scripts/smoke.sh` cobrindo SC-003, SC-004 e SC-005 (login, 403 no admin, bypass de status, conflito, adjacência, reject sem motivo, linhas do CSV) — *60 checagens; sobe um servidor próprio em banco temporário (porta 3999), sem tocar no `database.sqlite`*
- [ ] T041 [P] Escrever `README.md`: equipe e integrantes (preencher), resumo, stack, instalação, `db:reset`, credenciais fictícias, estrutura, componentes reutilizados (Tailwind CDN, DM Sans, mock HTML) e ferramentas de IA usadas
- [ ] T042 [P] Adicionar `@types/cookie-parser` e declarações para `node:sqlite` para zerar os erros do `tsc --noEmit`
- [ ] T043 Testar `npm run build && npm start` (o servidor serve `dist/` na porta 3000) como plano B à banca
- [ ] T044 Executar o roteiro do quickstart.md cronometrado e ajustar o seed se algum passo falhar
- [ ] T045 `npm run db:reset` final e commit antes das 18h45

---

## Dependencies & Execution Order

- **Fase 2** depende da Fase 1 e bloqueia as demais.
- **US1 (Fase 3)** bloqueia a interface de todas as outras histórias (App, Login, Shell).
- **US2 → US3**: o banner de conflito usa o `EventForm`.
- **US4** depende de T019 e T020 (detalhe e edição) e do `EventForm`.
- **US5, US6 e US7** são independentes entre si após a Fase 3 e podem rodar em paralelo.
- **Fase 10** por último; T041 (README) pode começar a qualquer momento.

### Paralelismo sugerido

- Após a Fase 2: T015, T016 e T022 em paralelo (componentes isolados).
- Após M3: T033+T034 (cadastros), T035+T036 (relatórios) e T037–T039 (senha), cada par em uma frente.
