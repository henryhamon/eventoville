# Research: Demo Funcional

## R1 — Driver SQLite

- **Decisão**: manter `node:sqlite` (`DatabaseSync`).
- **Motivo**: já em uso, nativo no Node 22.5+, zero dependências e sem compilação nativa (o `better-sqlite3` exige build com node-gyp, o que é um risco na máquina da banca).
- **Alternativas**: `better-sqlite3`, citado na constituição, foi descartado pelo risco de instalação. Registrar a escolha no README.

## R2 — Persistência de sessão

- **Decisão**: tabela `sessions` com token aleatório de 32 bytes, cookie `httpOnly` e `sameSite=lax`, expiração em 24 h.
- **Motivo**: o `Map` em memória perde as sessões ao reiniciar o servidor (risco na demo) e fere o princípio III.
- **Alternativas**: JWT assinado foi descartado porque exige segredo em variável de ambiente e torna o logout mais complexo.

## R3 — E-mail de recuperação sem serviço externo

- **Decisão**: gravar o e-mail em `email_outbox` e registrar o link no log do servidor; o painel admin tem uma aba "Caixa de saída".
- **Motivo**: a constituição proíbe serviços externos e o edital proíbe credenciais no repositório. A banca consegue ver o "e-mail enviado".
- **Alternativas**: Nodemailer com SMTP exigiria credenciais; Ethereal depende de internet.

## R4 — Máquina de estados

- **Decisão**: endpoints de ação explícitos (`/submit`, `/cancel`, `/approve`, `/reject`) e um `PUT /api/events/:id` de edição que verifica `canEdit(user, event)`.
- **Motivo**: cada transição fica com uma validação clara e uma entrada de auditoria; impede atalhos como "POST com status APROVADO".

## R5 — Verificação de conflito

- **Decisão**: `start_time < :end AND end_time > :start` contra eventos `APROVADO` no mesmo `location_id` e `event_date`, excluindo o próprio id. Retorna a linha conflitante.
- **Motivo**: a desigualdade estrita deixa passar horários adjacentes (FR-018). Comparar strings `HH:MM` funciona porque o formato tem largura fixa.

## R6 — Exportação CSV

- **Decisão**: endpoint no servidor que reutiliza a função `queryReport(filters)` usada pela tabela; `Content-Type: text/csv; charset=utf-8`, BOM `﻿`, separador `;`, aspas duplicadas e `Content-Disposition: attachment`.
- **Motivo**: uma única query garante paridade com a tabela (SC-005); o BOM e o `;` fazem o Excel pt-BR abrir com acentos e colunas corretos.
- **Alternativas**: gerar no cliente com Blob também funcionaria, mas duplicaria a formatação. O servidor é a fonte única.

## R7 — Logo da Univille

- **Decisão**: arquivo local `public/univille-logo.svg` (ou `.png`), referenciado por `<img src="/univille-logo.svg" alt="Univille">` no `Header.tsx`.
- **Motivo**: funciona offline na banca e evita depender do site institucional.
- **Pendência**: o arquivo precisa ser obtido do material institucional público da Univille e versionado.

## R8 — Roteamento no frontend

- **Decisão**: roteamento por hash com `createSignal(location.hash)` e listener `hashchange`.
- **Motivo**: o servidor já faz fallback para `index.html`; o hash evita configurar o proxy do Vite e não adiciona `@solidjs/router`.

## R9 — Seed

- **Decisão**: o seed roda quando não há usuários (hoje o gatilho é a contagem de eventos). `npm run db:reset` remove o arquivo e reinicia. Os dados usam datas relativas ao mês atual, formatadas em horário local (sem `toISOString`, que desloca o dia em fusos positivos).
- **Conteúdo mínimo**: ver FR-031. O par de conflito é: "Palestra Noturna" APROVADO no Auditório Principal, no dia 25 do mês atual, das 19:00 às 20:00, e um RASCUNHO do Solicitante no mesmo local e data, das 19:30 às 21:00.
