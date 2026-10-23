# Quickstart: Demo Funcional

## Preparar (antes das 18h45)

```bash
npm install
npm run db:reset   # recria database.sqlite com o seed
npm run dev        # API em :3000, app em http://localhost:5173
```

Credenciais fictícias:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@univille.br | admin123 |
| Solicitante | solicitante@univille.br | sol123 |

## Roteiro da banca (alvo: menos de 4 min, SC-001)

1. **Página pública**: mostrar a logo da Univille e o título, a grade dos 3 meses e a busca local (digitar "auditório").
2. **Login como Solicitante** → "Minhas Solicitações" mostra pedidos em todos os estados, incluindo um Rejeitado com justificativa visível.
3. **Conflito**: abrir o rascunho "Workshop Noturno" (Auditório, dia 25, 19:30–21:00) → "Enviar para Aprovação" → bloqueado: *"Conflito de agenda com 'Palestra Noturna' (19:00–20:00)"*.
4. Mudar o início para 20:00 → enviar → **Aguardando aprovação** (horário adjacente é permitido).
5. **Sair → login como Admin** → fila filtrada por "Aguardando aprovação" → abrir o pedido → **Aprovar**.
6. Abrir a página pública: o evento já aparece na grade.
7. **Persistência**: no admin, editar o palestrante do evento aprovado → salvar → **F5** → o dado permanece. Mostrar o histórico de auditoria no detalhe.
8. (Se sobrar tempo) **Relatórios**: filtrar por curso → Exportar CSV → abrir.

## Validação técnica

```bash
bash scripts/smoke.sh   # login, RBAC, bypass de status, conflito, adjacência, reject, CSV
```

Checagens manuais:

- [ ] O Solicitante acessando `#/admin` é redirecionado; `curl` com o cookie dele em `/api/admin/users` retorna 403.
- [ ] Reiniciar o servidor (Ctrl+C, `npm run dev`) não desloga o usuário.
- [ ] "Esqueci minha senha" → link aparece no log do servidor e em Admin → Caixa de saída → redefinir → login com a nova senha → o mesmo link agora falha.
- [ ] O CSV abre no Excel com acentos corretos e o mesmo número de linhas da tabela.
