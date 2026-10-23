# Especificação de Funcionalidade: Demo Funcional do Sistema de Gestão de Eventos Institucionais

**Feature Branch**: `006-demo-funcional`

**Created**: 2026-10-23

**Status**: Draft

**Input**: Descrição do usuário: "Escopo consolidado do Software Engineering Challenge 2026 — Univille (Campus São Bento do Sul). Gerar a spec para deixar funcional a demo, usando o mock em `docs/mocks-html/mock.html`. Adicionar a logo da Univille no topo substituindo o asterisco verde e alterar 'evently' para 'Sistema de Gestão de Eventos Institucionais'."

## Contexto

As specs 001 a 005 cobrem partes do escopo, mas hoje só o portal público (001) tem interface. A autenticação e o fluxo de solicitações existem apenas na API, e o painel administrativo, os cadastros e os relatórios não existem. Esta spec consolida tudo o que falta para a **demonstração de 5 minutos à banca** (roteiro da seção 7.3 do edital) funcionar de ponta a ponta no navegador, com persistência real no SQLite.

O mock (`docs/mocks-html/mock.html`) define a **identidade visual**: paleta (forest `#0E6641`, brand `#328347`, sage `#50916B`, mint `#E8F5EE`, fundo `#EFEFEF`), fonte DM Sans, cartões arredondados com sombra suave e layout com **barra lateral** nas áreas autenticadas ("Usuário Logado" e "Administrador"). O conteúdo genérico do mock (ingressos, faturamento, categorias de shows) **não** faz parte do escopo e deve ser substituído pelas telas do domínio de eventos institucionais.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identidade institucional e acesso ao sistema (Priority: P1)

O visitante abre a página inicial, reconhece que se trata do sistema oficial da Univille e consegue entrar com e-mail e senha. Não há opção de criar conta.

**Why this priority**: É a porta de entrada de toda a demo. Sem login pela interface, nenhuma outra história pode ser demonstrada.

**Independent Test**: Abrir a página inicial, conferir logo e título, clicar em "Entrar", autenticar como Solicitante e como Administrador, recarregar a página (F5) e verificar que a sessão continua ativa.

**Acceptance Scenarios**:

1. **Given** a página inicial, **When** o visitante a abre, **Then** o topo exibe a logo da Univille no lugar do ícone de asterisco e o título "Sistema de Gestão de Eventos Institucionais" no lugar de "evently".
2. **Given** a página inicial, **When** o visitante procura uma forma de se cadastrar, **Then** não encontra nenhum botão ou link de "Criar Conta".
3. **Given** credenciais válidas de Solicitante, **When** o usuário entra, **Then** é levado à área "Minhas Solicitações".
4. **Given** credenciais válidas de Administrador, **When** o usuário entra, **Then** é levado ao painel administrativo.
5. **Given** credenciais inválidas, **When** o usuário tenta entrar, **Then** vê uma mensagem de erro clara e continua na tela de login.
6. **Given** um usuário autenticado, **When** recarrega a página (F5) ou o servidor é reiniciado, **Then** continua autenticado na mesma área.
7. **Given** um usuário autenticado, **When** clica em "Sair", **Then** volta à página pública sem acesso às áreas restritas.

---

### User Story 2 - Solicitante cria e acompanha pedidos de evento (Priority: P1)

O Solicitante preenche o formulário de solicitação, guarda como rascunho ou envia para aprovação, e acompanha o estado de cada pedido em "Minhas Solicitações".

**Why this priority**: É o primeiro passo do fluxo essencial que a banca exige ver ao vivo (criação/solicitação).

**Independent Test**: Autenticado como Solicitante, criar um rascunho incompleto, completá-lo, enviá-lo, editar e cancelar um pendente, e corrigir e reenviar um rejeitado, conferindo cada estado na listagem.

**Acceptance Scenarios**:

1. **Given** o Solicitante na área restrita, **When** abre "Nova Solicitação", **Then** o formulário contém: Nome do Evento, Tema, Curso/Coordenação, Centro de Custo (somente leitura), Data, Hora de Início, Hora de Fim, Local, Recursos, Palestrante, Público-alvo, Justificativa, Objetivo, Nome do Solicitante, Apoio do Cerimonial/Inscrições (Sim/Não), Declarações/Certificados (Sim/Não) e Observações.
2. **Given** a escolha de um Curso/Coordenação, **When** o campo muda, **Then** o Centro de Custo é preenchido automaticamente com o centro vinculado ao curso.
3. **Given** a escolha de um Local, **When** o campo muda, **Then** a lista de Recursos mostra apenas os recursos disponíveis naquele local, e recursos marcados que não pertencem ao novo local são desmarcados.
4. **Given** um formulário incompleto, **When** clica em "Guardar Rascunho", **Then** o pedido é gravado como Rascunho e aparece em "Minhas Solicitações".
5. **Given** um formulário com campo obrigatório vazio, **When** clica em "Enviar para Aprovação", **Then** o envio é bloqueado e os campos faltantes são indicados.
6. **Given** um formulário completo e sem conflito, **When** clica em "Enviar para Aprovação", **Then** o pedido passa a "Aguardando aprovação".
7. **Given** um pedido em Rascunho, **When** o autor o edita ou elimina, **Then** a ação é permitida.
8. **Given** um pedido "Aguardando aprovação", **When** o autor o edita ou cancela, **Then** a ação é permitida; um pedido editado é revalidado antes de voltar à fila.
9. **Given** um pedido Rejeitado, **When** o autor abre o pedido, **Then** vê a justificativa do Administrador e pode corrigir os dados e reenviar.
10. **Given** um pedido Aprovado, **When** o autor tenta editar ou cancelar, **Then** as ações não estão disponíveis e a API recusa a tentativa.
11. **Given** a listagem "Minhas Solicitações", **When** o Solicitante a consulta, **Then** vê apenas os pedidos de que é autor, com estado destacado por cor.

---

### User Story 3 - Bloqueio de conflito de agenda (Priority: P1)

O sistema impede que dois eventos ocupem o mesmo local, na mesma data, com horários sobrepostos a um evento já aprovado.

**Why this priority**: É a regra de negócio crítica que a banca pede para ver bloqueada ao vivo.

**Independent Test**: Com o seed carregado, tentar enviar um pedido que se sobreponha a um evento aprovado e verificar a mensagem de bloqueio; repetir com horário adjacente e com outro local e verificar que são permitidos.

**Acceptance Scenarios**:

1. **Given** um evento aprovado no Auditório das 19h00 às 20h00, **When** um pedido para o mesmo local e data das 19h30 às 21h00 é enviado, **Then** o envio é bloqueado com a mensagem "Conflito de agenda", indicando o evento conflitante e seu horário.
2. **Given** o mesmo evento aprovado, **When** um pedido das 20h00 às 21h00 é enviado, **Then** o envio é permitido (horários adjacentes).
3. **Given** o mesmo evento aprovado, **When** um pedido no mesmo horário em outro local é enviado, **Then** o envio é permitido.
4. **Given** dois pedidos pendentes sobrepostos, **When** o Administrador aprova o primeiro e tenta aprovar o segundo, **Then** a segunda aprovação é bloqueada por conflito.
5. **Given** um horário de fim anterior ou igual ao de início, **When** o pedido é enviado, **Then** é recusado com mensagem clara.

---

### User Story 4 - Administrador analisa, aprova e publica (Priority: P1)

O Administrador vê a fila de solicitações filtrada por estado, aprova (com revalidação de conflito) ou rejeita com justificativa obrigatória, e o evento aprovado aparece imediatamente na grade pública.

**Why this priority**: Fecha o fluxo essencial da demo: aprovação pelo Administrador e publicação imediata na grade pública.

**Independent Test**: Autenticado como Administrador, filtrar "Aguardando aprovação", aprovar um pedido, abrir a página pública e confirmar a publicação; rejeitar outro sem justificativa (bloqueado) e com justificativa (permitido).

**Acceptance Scenarios**:

1. **Given** o painel administrativo, **When** o Administrador abre a fila, **Then** vê todas as solicitações com contadores por estado e pode filtrar por estado.
2. **Given** um pedido pendente, **When** o Administrador abre seus detalhes, **Then** vê todos os campos do formulário, incluindo recursos e as respostas Sim/Não.
3. **Given** um pedido pendente sem conflito, **When** o Administrador aprova, **Then** o estado muda para Aprovado e o evento aparece na grade pública na próxima consulta, sem passos adicionais.
4. **Given** um pedido pendente, **When** o Administrador rejeita sem justificativa, **Then** a ação é bloqueada; **When** rejeita com justificativa, **Then** o estado muda para Rejeitado e a justificativa fica visível ao autor.
5. **Given** um evento aprovado, **When** o Administrador o edita, **Then** as alterações são gravadas após revalidação de conflito e refletidas na grade pública.
6. **Given** um evento aprovado, **When** o Administrador o cancela, **Then** ele some da grade pública e continua no histórico com estado Cancelado.
7. **Given** qualquer ação de aprovação, rejeição, edição ou cancelamento, **When** executada, **Then** fica registrado quem fez, o quê, quando e em qual solicitação, e o histórico é visível no detalhe do pedido.

---

### User Story 5 - Administrador gere os cadastros base (Priority: P2)

O Administrador cria, edita e remove Usuários, Cursos/Coordenações com Centro de Custo, Temas, Locais e os Recursos de cada Local.

**Why this priority**: Faz parte do escopo e da pontuação, mas a demo pode começar com os dados do seed. Por isso fica atrás do fluxo essencial.

**Independent Test**: Criar um tema e um local com recursos, criar um usuário Solicitante, entrar com esse usuário e verificar que o novo tema, local e recursos aparecem no formulário.

**Acceptance Scenarios**:

1. **Given** a seção Usuários, **When** o Administrador cria um usuário com nome, e-mail, senha inicial e perfil (Solicitante ou Administrador), **Then** o usuário consegue entrar com essas credenciais.
2. **Given** um e-mail já cadastrado, **When** o Administrador tenta criar outro usuário com ele, **Then** recebe mensagem de e-mail duplicado.
3. **Given** a seção Cursos/Coordenações, **When** o Administrador cadastra um curso com seu Centro de Custo, **Then** o curso aparece no formulário e preenche o Centro de Custo automaticamente.
4. **Given** a seção Locais, **When** o Administrador associa recursos a um local, **Then** apenas esses recursos ficam disponíveis no formulário para aquele local.
5. **Given** um cadastro referenciado por eventos existentes, **When** o Administrador tenta removê-lo, **Then** a remoção é bloqueada com mensagem explicativa, preservando a integridade do histórico.

---

### User Story 6 - Relatórios administrativos e exportação CSV (Priority: P2)

O Administrador filtra eventos por período, curso/coordenação e tema, vê o resultado em tabela e exporta exatamente esse resultado em CSV.

**Why this priority**: Pertence ao critério "Funcionalidades" (30 pts), mas não está no roteiro essencial da demo.

**Independent Test**: Aplicar combinações de filtros, comparar o número de linhas da tabela com o do CSV exportado e abrir o CSV numa planilha com acentos corretos.

**Acceptance Scenarios**:

1. **Given** a tela de Relatórios, **When** o Administrador define Data Inicial, Data Final, Curso/Coordenação e/ou Tema, individualmente ou combinados, **Then** a tabela mostra apenas os eventos que atendem a todos os filtros.
2. **Given** um resultado filtrado, **When** a tabela é exibida, **Then** contém as colunas: Nome do evento, Data, Horário inicial, Horário final, Tema, Curso/Coordenação, Centro de Custo, Local, Solicitante e Estado.
3. **Given** um resultado filtrado, **When** clica em "Exportar CSV", **Then** é baixado um arquivo `.csv` com exatamente os mesmos registros, colunas e ordem da tabela.
4. **Given** dados com acentos, vírgulas ou aspas, **When** o CSV é aberto numa planilha, **Then** os caracteres aparecem corretamente e as colunas não se desalinham.

---

### User Story 7 - Recuperação de senha por e-mail (Priority: P3)

Um usuário que esqueceu a senha solicita a recuperação informando o e-mail, recebe um link com token temporário e define uma nova senha.

**Why this priority**: Requisito obrigatório de segurança do edital ("login institucional ou recuperação de senha por e-mail"), mas raramente demonstrado nos 5 minutos.

**Independent Test**: Solicitar a recuperação, abrir o link registrado na caixa de saída de e-mails local, definir uma nova senha e entrar com ela; tentar reutilizar o mesmo link e verificar que é recusado.

**Acceptance Scenarios**:

1. **Given** a tela de login, **When** o usuário clica em "Esqueci minha senha" e informa o e-mail, **Then** vê a mesma mensagem de confirmação, exista ou não uma conta com aquele e-mail.
2. **Given** um e-mail cadastrado, **When** a recuperação é solicitada, **Then** um e-mail com link de redefinição é registrado na caixa de saída local e o token **não** é devolvido na resposta da API.
3. **Given** um link válido, **When** o usuário define nova senha, **Then** consegue entrar com ela e o link deixa de funcionar.
4. **Given** um link expirado (mais de 1 hora) ou já usado, **When** aberto, **Then** é recusado com mensagem clara.

---

### Edge Cases

- Um Solicitante tenta acessar uma URL do painel administrativo diretamente: é redirecionado e a API responde "sem permissão".
- Um Solicitante tenta, pela API, criar um evento já com estado Aprovado: o estado é ignorado e o pedido fica como Rascunho.
- Um Solicitante tenta ver ou alterar um pedido de outro autor: é recusado.
- Um rascunho sem local ou data é guardado: é permitido, mas o envio exige todos os campos obrigatórios.
- O Administrador muda o local de um evento aprovado para um horário ocupado: a edição é bloqueada por conflito.
- Um evento cancelado que nunca foi enviado (era Rascunho) pode ser eliminado; um que já foi enviado permanece no histórico como Cancelado.
- Eventos fora da janela de 3 meses (mês atual + 2 seguintes) não aparecem na grade pública, mesmo aprovados.
- O relatório sem nenhum filtro retorna todos os eventos; um filtro sem resultados mostra "Nenhum evento encontrado" e exporta um CSV apenas com o cabeçalho.
- O servidor é reiniciado durante a demo: dados e sessões continuam válidos.

## Requirements *(mandatory)*

### Functional Requirements

**Identidade e navegação**

- **FR-001**: O topo da página pública e das áreas restritas MUST exibir a logo da Univille no lugar do ícone de asterisco verde.
- **FR-002**: O nome do produto MUST ser "Sistema de Gestão de Eventos Institucionais" no lugar de "evently", inclusive no título da aba do navegador.
- **FR-003**: A página pública MUST oferecer apenas o botão "Entrar"; o botão "Criar Conta" MUST ser removido.
- **FR-004**: As áreas restritas MUST seguir o layout com barra lateral do mock, com itens de menu conforme o perfil e um botão "Sair".
- **FR-005**: Toda ação MUST dar retorno visual ao usuário (sucesso, erro de validação, conflito, sem permissão).

**Autenticação e permissões**

- **FR-006**: O sistema MUST autenticar por e-mail e senha, com senhas armazenadas apenas como hash.
- **FR-007**: Sessões MUST persistir no banco de dados e sobreviver ao recarregamento da página e ao reinício do servidor.
- **FR-008**: O sistema MUST NOT oferecer autocadastro; apenas o Administrador cria usuários.
- **FR-009**: A recuperação de senha MUST enviar um link com token temporário (validade de 1 hora, uso único) por e-mail; em ambiente local, o e-mail MUST ser registrado numa caixa de saída consultável e no log do servidor, e o token MUST NOT ser retornado pela API.
- **FR-010**: Toda rota restrita MUST verificar o perfil no servidor; esconder botões na interface não basta.

**Solicitações de evento**

- **FR-011**: O formulário MUST conter todos os campos listados na User Story 2, cenário 1.
- **FR-012**: Cada evento MUST ocupar um único local e um único dia.
- **FR-013**: O campo "Nome do Solicitante" MUST ser texto livre, independente do usuário autenticado que é autor do registro.
- **FR-014**: O Centro de Custo MUST ser derivado do Curso/Coordenação selecionado.
- **FR-015**: Os Recursos selecionáveis MUST depender do Local selecionado; o servidor MUST rejeitar recursos que não pertençam ao local.
- **FR-016**: Os campos obrigatórios para envio são: Nome do Evento, Tema, Curso/Coordenação, Data, Hora de Início, Hora de Fim, Local, Nome do Solicitante, Público-alvo, Justificativa e Objetivo. Rascunhos MAY ficar incompletos.
- **FR-017**: As transições de estado MUST seguir a máquina de estados abaixo, e o servidor MUST ignorar qualquer estado enviado pelo cliente fora dessas transições:

  | Estado atual | Ação | Quem | Novo estado |
  |---|---|---|---|
  | — | Guardar rascunho | Solicitante | Rascunho |
  | — / Rascunho / Rejeitado | Enviar (valida campos e conflito) | Autor | Aguardando aprovação |
  | Rascunho | Editar / Eliminar | Autor | Rascunho / (removido) |
  | Aguardando aprovação | Editar (revalida) | Autor | Aguardando aprovação |
  | Aguardando aprovação | Cancelar | Autor | Cancelado |
  | Aguardando aprovação | Aprovar (revalida conflito) | Admin | Aprovado |
  | Aguardando aprovação | Rejeitar (justificativa obrigatória) | Admin | Rejeitado |
  | Rejeitado | Editar | Autor | Rejeitado |
  | Aprovado | Editar (revalida conflito) / Cancelar | Admin | Aprovado / Cancelado |

- **FR-018**: A verificação de conflito MUST ocorrer no envio, em cada edição de pedido pendente ou aprovado e na aprovação: há conflito quando existe outro evento **Aprovado** no mesmo local e data com `início < fim_existente` e `fim > início_existente`. Horários adjacentes e locais diferentes MUST ser permitidos.
- **FR-019**: A mensagem de conflito MUST identificar o evento conflitante (nome e horário).
- **FR-020**: "Minhas Solicitações" MUST listar apenas os pedidos do autor autenticado, com estado, data, local e, quando houver, a justificativa de rejeição.

**Administração**

- **FR-021**: A fila de análise MUST listar todas as solicitações, filtráveis por estado, com contadores por estado.
- **FR-022**: Aprovar MUST publicar o evento na grade pública imediatamente.
- **FR-023**: O Administrador MUST poder editar e cancelar eventos aprovados; eventos cancelados MUST sair da grade pública e permanecer no histórico.
- **FR-024**: Cada aprovação, rejeição, edição pelo Administrador, cancelamento e envio MUST gerar um registro de auditoria (usuário, ação, data/hora, solicitação, estado anterior e novo, justificativa quando houver), visível no detalhe do pedido.
- **FR-025**: O painel MUST oferecer CRUD de Usuários (perfil Solicitante ou Administrador), Cursos/Coordenações com Centro de Custo, Temas, Locais e Recursos, incluindo a associação de recursos a locais.
- **FR-026**: A remoção de um cadastro referenciado por eventos MUST ser bloqueada com mensagem explicativa.

**Relatórios**

- **FR-027**: Os relatórios MUST oferecer os filtros Data Inicial, Data Final, Curso/Coordenação e Tema, usáveis individualmente ou combinados.
- **FR-028**: A tabela do relatório MUST exibir as colunas da User Story 6, cenário 2.
- **FR-029**: A exportação MUST gerar um `.csv` com exatamente os registros, colunas e ordem exibidos, codificado em UTF-8 com BOM, separador `;` e campos com aspas escapadas, para abrir corretamente no Excel em pt-BR.
- **FR-030**: Apenas Administradores MUST acessar relatórios e exportação.

**Dados de demonstração e documentação**

- **FR-031**: O seed MUST conter: ao menos 1 Administrador e 2 Solicitantes; 3 ou mais cursos com centro de custo; 4 ou mais temas; 3 ou mais locais com recursos associados; e eventos em **todos** os estados (Rascunho, Aguardando aprovação, Rejeitado com justificativa, Aprovado, Cancelado), incluindo aprovados nos 3 meses da janela pública e um par preparado para demonstrar o conflito (ex.: Auditório aprovado das 19h00 às 20h00).
- **FR-032**: O seed MUST ser recarregável por um comando documentado, que recria o banco a partir do zero, para preparar a demo antes das 18h45 sem editar código.
- **FR-033**: O README.md MUST conter: nome da equipe e integrantes; resumo e tecnologias; instruções de instalação, execução e configuração do banco; credenciais fictícias de Solicitante e Administrador; componentes reutilizados e ferramentas de IA utilizadas.

### Key Entities *(include if feature involves data)*

- **Usuário**: nome, e-mail institucional (único), hash de senha, perfil (Solicitante, Administrador), curso opcional.
- **Sessão**: token opaco, usuário, data de expiração; persistida no banco.
- **Curso/Coordenação**: nome, código e Centro de Custo (texto).
- **Tema**: nome único (ex.: Palestra, Congresso, Workshop).
- **Local (Ambiente)**: nome, capacidade, descrição; possui N Recursos.
- **Recurso**: nome, descrição; pertence a um ou mais Locais.
- **Evento (Solicitação)**: todos os campos do formulário, estado, justificativa de rejeição, autor (usuário), centro de custo derivado, recursos escolhidos (N:N) e datas de criação e atualização.
- **Registro de Auditoria**: evento, usuário, ação, estado anterior, estado novo, comentário, data/hora.
- **E-mail de Saída**: destinatário, assunto, corpo e data; representa os e-mails enviados pelo sistema em ambiente local.
- **Token de Recuperação de Senha**: token, usuário, expiração e indicador de uso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O roteiro completo da banca (login como Solicitante → criar e enviar pedido → ver bloqueio de conflito → login como Administrador → aprovar → ver o evento na grade pública → editar → F5 → dados persistem) é executado em **menos de 4 minutos** sem usar terminal nem editar o banco manualmente.
- **SC-002**: 100% dos 5 estados do ciclo de vida podem ser mostrados com dados do seed logo após recriar o banco.
- **SC-003**: 100% das tentativas de sobreposição no mesmo local e data são bloqueadas no envio, na edição e na aprovação; 0 falsos positivos para horários adjacentes ou locais diferentes.
- **SC-004**: 100% das rotas administrativas recusam usuários não Administradores, inclusive chamadas diretas à API.
- **SC-005**: O número de linhas do CSV exportado é igual ao da tabela filtrada em 100% das combinações de filtro testadas, e os acentos aparecem corretamente ao abrir no Excel.
- **SC-006**: Após recarregar a página ou reiniciar o servidor, 100% dos registros criados ou editados e a sessão ativa permanecem.
- **SC-007**: Um avaliador sem instruções prévias identifica a página como sistema da Univille e encontra o botão "Entrar" em menos de 5 segundos.
- **SC-008**: Um avaliador consegue instalar e rodar o projeto seguindo apenas o README em menos de 5 minutos.

## Assumptions

- A stack é mantida conforme a constituição: Node.js + Express + SQLite (`database.sqlite`) + SolidJS/Vite, com backend concentrado em `db.ts` e `server.ts`.
- Não há serviço de e-mail externo; o envio é simulado por uma caixa de saída persistida no banco e pelo log do servidor, o que atende ao requisito sem credenciais reais no repositório.
- A logo da Univille é um arquivo de imagem local versionado no repositório (ex.: `public/univille-logo.svg` ou `.png`), fornecido pela equipe a partir do material institucional público. O sistema não carrega a logo de sites externos em tempo de execução.
- O Centro de Custo é um atributo textual do Curso/Coordenação, e não uma entidade independente.
- "Público-alvo" é texto livre.
- Edições feitas pelo autor em pedido "Aguardando aprovação" mantêm o pedido na fila após revalidação; não há reenvio separado.
- A grade pública mantém o comportamento da spec 001 (janela de 3 meses, busca local), apenas com o novo cabeçalho.
- Inscrição de participantes, emissão de declarações e certificados estão fora do escopo; existem apenas como respostas Sim/Não no pedido.
- O conteúdo ilustrativo do mock (ingressos, faturamento, categorias de shows, destaque de festival) não será implementado.
- Todos os dados do seed são fictícios.
