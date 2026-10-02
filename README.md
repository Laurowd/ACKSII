# ACKS II - Character Sheet

Ficha de personagem para **Adventurer Conqueror King System II** (backend + frontend).

Para publicar na hospedagem escolhida, siga [Vercel + Neon](docs/PRODUCAO_VERCEL.md): configuração da API, variáveis, Resend, migrações, verificações e rollback.

Para hospedar em servidor com Docker, consulte [Implantação e operação](docs/PRODUCAO.md): Docker Compose, HTTPS, migrações, backups, restauração, rollback e homologação.

Para continuar usando o banco existente no Neon, siga [Produção com Neon](docs/PRODUCAO_NEON.md). Há um Compose sem banco local, conexões separadas para API/migrações e exportação com teste de restauração isolado.

**Fluxos principais:** conjuração, repertório e descanso ficam na aba **Magia**. **Evolução & Regras** reúne avanço com rolagem de PV, fechamento de aventura para XP, domínio mensal, pesquisa e cargas de itens. Há criação com orçamento e validação de escolhas, equipamentos corrigidos e construtor de classes por pontos. Veja [como usar e limites da automação](docs/FLUXOS_ACKS_II.md).

O **Painel do Mestre** oferece uma visão compacta dos recursos do grupo. Fichas podem ser exportadas para impressão ou JSON e importadas como novas fichas: consulte [portabilidade e consulta de sessão](docs/PORTABILIDADE_FICHAS.md).

## Pré-requisitos

- **Node.js** 24 LTS (24.14 ou posterior na série 24)
- **npm** (vem com o Node)

## 1. Backend (API)

```bash
cd backend
```

### Instalar dependências

```bash
npm install
```

### Banco de dados (PostgreSQL)

Crie o arquivo `.env` na pasta `backend` (se ainda não existir) com:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/acks2"
JWT_SECRET="sua-chave-secreta-aqui"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

Use `backend/.env.example` como base e **nunca** versione credenciais reais.
Se você já usou uma URL/senha real em `.env`, rotacione a credencial no provedor do banco.

Rode as migrações e gere o Prisma Client:

```bash
npx prisma generate
npx prisma migrate dev
```

### Subir o servidor

**Desenvolvimento**:

```bash
npm run dev
```

O backend ficará em **http://localhost:3001**.  
Health check: http://localhost:3001/api/health

**Produção** (após build):

```bash
npx prisma migrate deploy
npm run build
npm start
```

---

## 2. Frontend (Vue + Vite)

Em **outro terminal**:

```bash
cd frontend
```

### Instalar dependências

```bash
npm install
```

### Subir o frontend

```bash
npm run dev
```

A aplicação abre em **http://localhost:5173**.  
As requisições para `/api` são enviadas automaticamente para o backend (proxy para `http://localhost:3001`).

---

## Resumo rápido (do zero)

**Terminal 1 – Backend:**

```bash
cd "c:\Dev\ACKS II - Character Sheet\backend"
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Terminal 2 – Frontend:**

```bash
cd "c:\Dev\ACKS II - Character Sheet\frontend"
npm install
npm run dev
```

Depois acesse **http://localhost:5173**, registre um usuário e use a ficha.

## Catálogo, criação por etapas e portabilidade

- **Classes** no menu abre o catálogo base, disponível mesmo sem campanha. Ao selecionar uma campanha, suas classes próprias aparecem junto às bases, com identificação da origem.
- **Novo personagem** abre cinco etapas: atributos, classe, identidade, equipamento e revisão. A confirmação cria a ficha e seus itens/proficiências em uma única operação. Nenhuma ficha parcial é criada ao apenas avançar etapas. Sair descarta o rascunho após confirmação.
- Na etapa **Identidade**, o modo do livro confere categorias e limites de proficiências e magias. Uma escolha fora da lista é apontada junto ao campo; trocar classe preserva o rascunho e pede a correção de incompatibilidades. Magias de campanha podem ser registradas no modo manual, com a decisão do mestre. A revisão mostra as magias escolhidas antes da confirmação.
- O mestre cria classes em **Campanhas → Gerenciar → Classes da campanha**. Pode começar do zero ou copiar as tabelas do catálogo. O editor tem três etapas: identidade e poderes, progressão e revisão. XP deve começar em zero e crescer; todas as tabelas precisam corresponder aos níveis cadastrados.
- A cópia de uma base inclui progressão e requisitos de atributos. O editor livre permite tabelas manuais; o construtor por pontos calcula custos, progressão e magia. Poderes condicionais, seleções específicas e exceções continuam sujeitos ao mestre.
- Classes de campanha existentes são preservadas. Novas escolhas usam um identificador estável; renomear uma classe mantém o vínculo e atualiza o nome nas fichas. Classes em uso não podem ser excluídas. Para transferir um personagem com classe própria a outra campanha, escolha e salve uma classe base primeiro.
- Título, dado de vida, XP do próximo nível, salvamentos e ataque usam a progressão da classe ao salvar, respeitando a opção de progressão automática da campanha. Para conduzir a rolagem de PV e conferir escolhas ao subir de nível, use **Evolução & Regras**; os editores manuais continuam disponíveis.
- **Exportar JSON** baixa os dados atuais da ficha e uma cópia de referência da definição da classe. **Personagens → Importar JSON** cria uma nova ficha na conta conectada, com novos identificadores, preservando valores e saldos. A definição de uma classe própria precisa estar disponível no destino; histórico de operações não é restaurado. Veja [formato, passos e limites](docs/PORTABILIDADE_FICHAS.md).
- **Ficha para impressão/PDF** baixa um HTML independente. Abra-o e use **Imprimir / salvar em PDF**. JSON e impressão calculam CA e movimento pelos valores atuais, incluindo edições pendentes de salvamento.
- **Painel do Mestre → Sessão da campanha** reúne PV, CA, movimento, salvamentos e magia restante das campanhas administradas e fichas avulsas do próprio mestre. A consulta de regras fica em uma visão separada do mesmo painel.

### Atualizar uma instalação existente

A migração `20260911090000_class_catalog` adiciona os campos de vínculo e descrição de classes. Ela deve ser aplicada antes de iniciar a API atualizada. As migrações anteriores pendentes também serão aplicadas. Para um banco existente, confira o destino configurado e tenha um backup; não use `migrate reset`.

O histórico inclui `20260929100000_rule_workflows` e `20260929110000_magic_item_state`, além do endurecimento de produção de 28/09. Confira todas as migrações pendentes no destino antes de atualizar.

```bash
cd backend
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run build
```

Se o banco foi mantido anteriormente com `prisma db push`, confira a correspondência com o histórico de migrações antes do deploy. A implementação do catálogo não executa migrações automaticamente.

---

## Problemas comuns

- `npm run dev` no backend falha com `JWT_SECRET environment variable is required`:
	- Verifique se `backend/.env` existe e contém `JWT_SECRET`.
- Frontend informa porta ocupada:
	- O Vite pode subir em `http://localhost:5174` automaticamente.
- `npm start` no backend falha sem build:
	- Rode `npm run build` antes de `npm start`.

---

## Scripts úteis

| Onde      | Comando              | Descrição                    |
|----------|----------------------|------------------------------|
| Backend  | `npm run dev`        | Servidor em desenvolvimento  |
| Backend  | `npm run build`      | Compila TypeScript           |
| Backend  | `npm start`          | Roda o build (produção)      |
| Backend  | `npx prisma migrate dev` | Cria/aplica migrações  |
| Backend  | `npx prisma migrate deploy` | Aplica migrações em produção |
| Frontend | `npm run dev`        | Dev server (Vite)            |
| Frontend | `npm run build`      | Build para produção          |
| Frontend | `npm run preview`    | Preview do build             |
| Frontend | `npm test`           | Testes (Vitest)              |
| Frontend | `npm run test:cypress` | Cypress headless com API e banco locais de teste |
| Frontend | `npm run test:cypress:open` | Interface interativa do Cypress |

Para executar o Cypress, prepare os builds e o PostgreSQL isolado conforme [Testes com Cypress](docs/TESTES_CYPRESS.md). O executor exige `TEST_DATABASE_URL` apontando para um banco local chamado `acks_test`; ele não utiliza o banco Neon configurado em `backend/.env`. A cobertura inclui fluxos de interface e testes complementares da API. Os testes Playwright existentes continuam disponíveis.

---

## Implementações recentes

- Rate limiting por IP nas rotas sensíveis de autenticação/campanha/assignment.
- Logs de request com `requestId`, rota, status e duração no backend.
- Validação de payload via schema em endpoints críticos (`auth`, `campaigns`, `characters/assignment`).
- Toasts globais no frontend para feedback de sucesso/erro (incluindo `401` e `429`).
- Pipeline de CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) com build e testes de backend/frontend.
- Acesso de mestres isolado às campanhas que administram.
- **Fechar aventura** centraliza tesouro e monstros para distribuir XP, com identificador único, proteção contra repetição e atualização conjunta dos participantes. A conversão direta do inventário foi desativada; ajustes excepcionais de XP ficam disponíveis ao mestre com justificativa.
- **Magia** centraliza conjuração, repertório e descanso usando o saldo automático; referências manuais ficam recolhidas para o mestre.
- Salvamento da ficha e dos editores menores coordenado por versão, com fila, indicação de alterações pendentes, tentativa de recuperação e proteção ao sair da página.
- Exportação JSON/HTML com cálculos compartilhados e importação transacional de novas fichas, conforme [portabilidade](docs/PORTABILIDADE_FICHAS.md).
- Visão de sessão do mestre com recursos atuais do grupo, filtros e indicação de atualização; navegação responsiva, contraste dos temas e estados de foco revisados.
- Gerenciamento de campanha com tratamento de falhas de carregamento e bloqueio de envios repetidos de calendário, configurações, economia, atividades e convites.
- Migrações sincronizadas com os recursos de atividades, exércitos, pesquisa mágica e comércio.

### Correções de regras de setembro de 2026

A migração `20260911140000_acks_rules_alignment` acrescenta campos de pesquisa, domínio, ajuste de CA e requisitos de classes próprias. Execute `npx prisma migrate deploy` no backend antes de iniciar esta versão. O histórico e os projetos antigos são preservados; pesquisas antigas ficam em modo manual.

- Ataque usa base + CA − bônus, com escolha de estilo para diferenciar corpo a corpo de arremesso. CA usa armadura, DEX e ajuste explícito. Cura natural mostra 1d3 por dia de descanso. Carga superior a 20 + modificador de STR impede movimento.
- Itens e proficiências têm salvamento próprio. Compras atualizam saldo e inventário na mesma transação, com troco em GP/SP/CP. PP e EP podem ser convertidos manualmente antes de comprar.
- Salvamentos preservam ajustes ao mudar nível ou WIL. Os limites das seis classes raciais estão no catálogo. Fichas antigas e classes próprias copiadas anteriormente continuam exigindo conferência dos valores existentes.
- A criação oferece o método padrão de atributos, requisitos de classe, rolagem de PV e Adventuring. O modo do livro confere listas e limites das escolhas iniciais e orçamento de equipamento. Templates, poderes condicionais e exceções específicas continuam sujeitos à conferência do mestre.
- Domínio separa terra, serviços e impostos. Receitas representam valor econômico e não aumentam automaticamente o tesouro. Despesas normais podem ser preenchidas pelo botão específico.
- Pesquisa acompanhada calcula componentes, materiais, trabalho e prazo, registra pagamento inicial e períodos de trabalho, e resolve o teste final com consumo de componentes. Multiefeitos, experimentação e exceções de classes/proficiências permanecem manuais; veja [os limites do fluxo](docs/FLUXOS_ACKS_II.md).
- O calendário usa quatro semanas por mês e avança atividades das fichas, projetos antigos/manuais e a fila de campanha. Pesquisas acompanhadas usam seus próprios períodos de trabalho. Recarregue fichas abertas para ver o avanço. Custos extras de domínio são somados aos salários dos seguidores; não lance o mesmo salário nos dois lugares.
- O construtor de classes por pontos calcula categorias, custos/trocas iniciais, XP, ataque, salvamentos, PV, magia e limites raciais. O editor livre permanece disponível; poderes condicionais e variantes além da construção suportada exigem revisão do mestre.

Os testes unitários não escrevem no Neon; os testes de backend usam banco simulado. Rode `npm.cmd test` em `backend` e `frontend`. Cypress, Playwright e os testes de integração usam PostgreSQL local isolado, conforme [o guia de testes](docs/TESTES_CYPRESS.md).
