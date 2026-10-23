# Data Model: Demo Funcional

Alterações sobre o schema atual (`db.ts`). Todas devem ser aplicadas de forma idempotente por `migrateDatabase()`: `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ADD COLUMN` só quando a coluna não existe.

## Tabelas alteradas

### courses
| Coluna | Tipo | Regra |
|---|---|---|
| cost_center | TEXT NOT NULL DEFAULT '' | **nova**; Centro de Custo vinculado (ex.: `CC-101 Sistemas de Informação`) |

### events (já migrada na correção anterior)
Colunas existentes mais `requester_name`, `target_audience`, `justification`, `objective`, `needs_ceremonial`, `needs_certificates`, `observations` e `cost_center`.

- `location_id`, `event_date`, `start_time` e `end_time` passam a ser anuláveis, para permitir rascunhos incompletos (FR-016). Strings vazias não serviriam, porque violariam a FK de `location_id`. Bancos antigos com `NOT NULL` são reconstruídos por `migrateDatabase()`: cria `events_new`, copia os dados e renomeia, com as FKs desligadas durante a troca. A obrigatoriedade passa a ser validada no envio.
- `cost_center` é copiado de `courses.cost_center` a cada gravação.

## Tabelas novas

### location_resources
| Coluna | Tipo | Regra |
|---|---|---|
| location_id | INTEGER NOT NULL | FK `locations(id)` ON DELETE CASCADE |
| resource_id | INTEGER NOT NULL | FK `resources(id)` ON DELETE CASCADE |
| | | PK (location_id, resource_id) |

### sessions
| Coluna | Tipo | Regra |
|---|---|---|
| token | TEXT PRIMARY KEY | 32 bytes em hex |
| user_id | INTEGER NOT NULL | FK `users(id)` ON DELETE CASCADE |
| expires_at | TEXT NOT NULL | ISO; agora + 24 h |

### event_audit
| Coluna | Tipo | Regra |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| event_id | INTEGER NOT NULL | FK `events(id)` ON DELETE CASCADE |
| user_id | INTEGER NOT NULL | FK `users(id)` |
| action | TEXT NOT NULL | `CRIADO`, `EDITADO`, `ENVIADO`, `CANCELADO`, `APROVADO`, `REJEITADO` |
| from_status | TEXT | |
| to_status | TEXT | |
| comment | TEXT | justificativa ou resumo |
| created_at | TEXT DEFAULT (datetime('now')) | |

### email_outbox
| Coluna | Tipo | Regra |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| to_email | TEXT NOT NULL | |
| subject | TEXT NOT NULL | |
| body | TEXT NOT NULL | contém o link `#/redefinir/<token>` |
| created_at | TEXT DEFAULT (datetime('now')) | |

## Máquina de estados

```text
            guardar                  enviar*                 aprovar*
  (novo) ─────────► RASCUNHO ───────────────► AGUARDANDO ───────────► APROVADO
                      │  ▲                     │    │                  │   │
              eliminar│  │                rejeitar  cancelar   editar*(admin)│ cancelar(admin)
                      ▼  │                (motivo)  │                  ▲───┘   ▼
                  (removido)                   ▼    ▼                       CANCELADO
                              REJEITADO ──enviar*──► AGUARDANDO
                              (editar pelo autor)

* = valida campos obrigatórios e conflito de agenda
```

| Estado | Autor pode | Admin pode |
|---|---|---|
| RASCUNHO | editar, eliminar, enviar | ver |
| AGUARDANDO_APROVACAO | editar (revalida), cancelar | aprovar, rejeitar |
| REJEITADO | editar, enviar | ver |
| APROVADO | ver | editar (revalida), cancelar |
| CANCELADO | ver | ver |

## Seed (FR-031)

- **Usuários**: `admin@univille.br` / `admin123` (ADMIN), `solicitante@univille.br` / `sol123` (SOLICITANTE), `maria.souza@univille.br` / `sol123` (SOLICITANTE).
- **Cursos**: Sistemas de Informação (SI, `CC-101`), Engenharia de Software (ES, `CC-102`), Ciência da Computação (CC, `CC-103`), Coordenação de Extensão (EXT, `CC-200`).
- **Temas**: Palestra, Workshop, Congresso, Seminário, Mesa-redonda.
- **Locais e recursos**: Auditório Principal (Projetor, Microfone, Som, Transmissão ao vivo); Sala 101 (Projetor, Quadro branco); Laboratório de Informática (Projetor, Computadores, Quadro branco).
- **Eventos**: 3 ou mais APROVADO, espalhados pelos 3 meses da janela; 1 APROVADO às 19:00–20:00 no Auditório para a demo de conflito; 1 AGUARDANDO_APROVACAO; 1 REJEITADO com `rejection_reason`; 1 RASCUNHO conflitante (19:30–21:00, Auditório, mesma data); 1 CANCELADO; 1 APROVADO fora da janela (mês −1) para provar o filtro da grade. Cada evento do seed tem pelo menos uma entrada em `event_audit`.
