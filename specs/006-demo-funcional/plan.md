# Implementation Plan: Demo Funcional do Sistema de Gestão de Eventos Institucionais

**Branch**: `006-demo-funcional` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação em `/specs/006-demo-funcional/spec.md`

## Summary

Completar o MVP para a banca: identidade Univille no cabeçalho, telas de login e recuperação de senha, área do Solicitante (formulário completo e "Minhas Solicitações"), painel do Administrador (fila com filtros, aprovar/rejeitar, editar/cancelar aprovados, auditoria, CRUDs) e relatórios com exportação CSV. No backend: sessões e caixa de e-mails persistidas no SQLite, máquina de estados aplicada no servidor, recursos por local, auditoria, endpoints de CRUD e de relatório, e seed com todos os estados. O visual segue o mock (`docs/mocks-html/mock.html`): paleta forest/brand/sage/mint, DM Sans, cartões arredondados e barra lateral nas áreas autenticadas.

**Prazo**: congelamento do código às **18h45 de 23/10/2026**. As fases estão ordenadas para que cada uma deixe a demo num estado apresentável (ver "Ordem de entrega" em [tasks.md](./tasks.md)).

## Technical Context

**Language/Version**: TypeScript em Node.js 22+ (o ambiente local usa 26.3.1), executado com `tsx`
**Primary Dependencies**: Express 4, cookie-parser, `node:sqlite` (`DatabaseSync`), `node:crypto` (scrypt); frontend SolidJS 1.9 + Vite 5 + Tailwind via CDN (já em uso)
**Storage**: SQLite no arquivo `database.sqlite`, com migração idempotente em `initDatabase()`
**Testing**: script de fumaça com `curl` (`scripts/smoke.sh`) mais o roteiro manual do [quickstart.md](./quickstart.md)
**Target Platform**: navegador desktop moderno; servidor local
**Project Type**: aplicação web (backend Express + SPA SolidJS servida pelo Vite em dev e por `dist/` em produção)
**Performance Goals**: telas e respostas da API abaixo de 1 s com o volume do seed
**Constraints**: backend apenas em `db.ts` e `server.ts`; nenhuma dependência paga ou serviço externo; sem roteador nem biblioteca de UI novos (roteamento por hash com signal)
**Scale/Scope**: dezenas de usuários e centenas de eventos; cerca de 8 telas

## Constitution Check

*GATE: verificado antes da Fase 0 e revisado após a Fase 1.*

- [x] **I. Idioma**: docs em PT-BR, código e comentários em inglês. Os rótulos da interface ficam em PT-BR por serem conteúdo para o usuário.
- [x] **II. Stack**: Node + Express + SQLite + SolidJS/Vite. A constituição cita `better-sqlite3`, mas o projeto já usa `node:sqlite`, nativo e sem dependência, que é mais alinhado à economia de arquivos. Ver [research.md](./research.md) R1.
- [x] **II. Economia de arquivos**: backend em `db.ts` e `server.ts`; frontend em poucos componentes em `src/components/`.
- [x] **III. Banco real**: sessões, e-mails de saída e auditoria também vão para o SQLite. O `Map` de sessões em memória é removido.
- [x] **IV. RBAC**: middlewares `requireAuth` e `requireAdmin` em todas as rotas restritas; nenhum endpoint de autocadastro.
- [x] **V. Conflito**: `checkConflict` aplicado em envio, edição de pendente ou aprovado e aprovação.
- [x] **VI. Máquina de estados**: transições centralizadas numa tabela no servidor; o estado enviado pelo cliente é ignorado.

Nenhuma violação, então a seção Complexity Tracking fica vazia.

## Project Structure

### Documentation (this feature)

```text
specs/006-demo-funcional/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # decisões técnicas
├── data-model.md        # schema e migração
├── quickstart.md        # roteiro da demo e validação
├── contracts/
│   └── api.md           # endpoints REST
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
db.ts                      # schema, migração, seed, queries de leitura
server.ts                  # rotas, middlewares, máquina de estados, CSV
index.html                 # título da aba
public/
└── univille-logo.svg      # logo institucional (asset local)
scripts/
├── reset-db.sh            # apaga database.sqlite e reinicia o seed (npm run db:reset)
└── smoke.sh               # testes de fumaça da API
src/
├── App.tsx                # roteamento por hash + guarda de sessão/perfil
├── api.ts                 # wrapper fetch com tratamento de erro
├── components/
│   ├── Header.tsx         # logo Univille + título (reusado na pública e no login)
│   ├── PublicPortal.tsx   # grade pública (existente; passa a usar Header)
│   ├── Login.tsx          # login + esqueci senha + redefinir senha
│   ├── Shell.tsx          # layout autenticado com sidebar (mock "Usuário Logado"/"Admin")
│   ├── StatusBadge.tsx    # badge colorido por estado
│   ├── EventForm.tsx      # formulário de solicitação (criar/editar; usado por solicitante e admin)
│   ├── MyRequests.tsx     # "Minhas Solicitações"
│   ├── AdminQueue.tsx     # fila por estado + detalhe + aprovar/rejeitar/cancelar + auditoria
│   ├── AdminCatalog.tsx   # CRUDs: usuários, cursos, temas, locais (+recursos), recursos
│   └── Reports.tsx        # filtros + tabela + exportar CSV
README.md
```

**Structure Decision**: aplicação web de projeto único, mantendo backend em dois arquivos (constituição II). A logo vai em `public/`, pasta que o Vite serve na raiz e copia para `dist/`.

## Design Decisions (resumo; detalhes em research.md)

1. **Sessões persistidas**: tabela `sessions(token, user_id, expires_at)`. `requireAuth` lê do banco. Atende SC-006 (reinício do servidor).
2. **Máquina de estados no servidor**: um endpoint por ação (`submit`, `cancel`, `approve`, `reject`), mais `PUT /api/events/:id` para edição com regras por perfil e estado. O `status` do corpo nunca é gravado diretamente.
3. **Conflito**: `checkConflict` retorna o evento conflitante (nome e horário) para a mensagem do FR-019.
4. **Recursos por local**: tabela `location_resources`; `GET /api/meta/locations` inclui `resource_ids`; o servidor valida `resource_ids ⊆ recursos do local`.
5. **Centro de custo**: coluna `cost_center` em `courses`; copiada para `events.cost_center` ao salvar.
6. **Auditoria**: tabela `event_audit`, preenchida por `logAudit()` em cada transição e edição administrativa.
7. **E-mail local**: tabela `email_outbox` mais `console.log` do link; `GET /api/admin/outbox` permite mostrar à banca.
8. **CSV**: gerado no servidor por `GET /api/admin/reports.csv` com os mesmos filtros e a mesma query da tabela, o que garante "exatamente os mesmos registros"; UTF-8 com BOM, `;` e aspas escapadas.
9. **Roteamento**: `location.hash` (`#/`, `#/login`, `#/minhas`, `#/nova`, `#/editar/:id`, `#/admin`, `#/admin/cadastros`, `#/admin/relatorios`, `#/redefinir/:token`) com `createSignal`, sem dependência nova.
10. **Seed recarregável**: `npm run db:reset` remove `database.sqlite` e sobe o seed. O seed calcula datas relativas ao mês atual, então funciona em qualquer dia.

## Complexity Tracking

Nenhuma violação a justificar.
