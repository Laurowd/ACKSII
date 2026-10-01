# Testes com Cypress

Cypress e Testing Library estão nas dependências de desenvolvimento do frontend. A suíte usa o frontend compilado, a API real, migrations reais e PostgreSQL local. Contas e fichas são exclusivas de cada caso. Recuperação de senha usa SMTP capturado em memória/arquivo local, sem envio externo.

## Executar no Windows

Requisitos: Node na versão de `.nvmrc`, dependências instaladas e PostgreSQL local. O Docker Compose abaixo é uma opção para iniciar somente o banco de testes; se já houver PostgreSQL local, crie um banco exclusivo chamado `acks_test` e ajuste a URL.

Na raiz do projeto, em PowerShell:

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd run prisma:generate --prefix backend
npm.cmd run build --prefix backend
npm.cmd run build --prefix frontend
docker compose -p acks-cypress -f compose.cypress.yml up -d --wait
$env:TEST_DATABASE_URL = 'postgresql://acks_test:local-test-only@127.0.0.1:55439/acks_test'
npm.cmd run test:cypress --prefix frontend
```

O executor aplica as migrations no banco de testes e abre API em `127.0.0.1:3210` e frontend em `127.0.0.1:4276`. Ele encerra esses servidores ao terminar. Não é necessário iniciar `npm run dev`. Dados de testes permanecem no PostgreSQL; o Compose usa armazenamento temporário e perde esses dados quando o contêiner é removido.

Para encerrar somente o banco criado acima:

```powershell
docker compose -p acks-cypress -f compose.cypress.yml down
```

Para executar interativamente ou selecionar um arquivo:

```powershell
npm.cmd run test:cypress:open --prefix frontend
npm.cmd run test:cypress --prefix frontend -- --spec=cypress/e2e/creation.cy.js
```

Linux/macOS: os mesmos scripts, usando `npm` e `export TEST_DATABASE_URL=...`. No CI, o PostgreSQL já é um serviço do workflow. Recompile após mudar código da aplicação: os testes usam `dist`, não o servidor de desenvolvimento.

O navegador padrão é o Electron incluído no Cypress; `CYPRESS_BROWSER=chrome` ou `edge` seleciona um navegador instalado. `CYPRESS_API_PORT` e `CYPRESS_WEB_PORT` permitem alterar as portas. Se a instalação do binário for bloqueada pelo npm, execute `npx.cmd cypress install` dentro de `frontend`. Em executores Windows sem terminal, use uma sessão com entrada padrão persistente: o Cypress pode encerrar ao receber EOF. O script remove a variável `ELECTRON_RUN_AS_NODE` herdada de IDEs Electron.

## Cobertura

Os casos marcados como API usam `cy.request` contra o servidor real e verificam estado persistido. As demais jornadas interagem com a interface; preparação de contas/fichas usa tarefas locais e API para evitar repetir cadastro em cada caso.

| Arquivo em `frontend/cypress/e2e` | Casos de uso |
| --- | --- |
| `auth-navigation.cy.js` | Cadastro, login válido/inválido, logout com revogação, recuperação via SMTP, link de uso único, resposta neutra, sessão corrompida, rota inexistente, recuperação após falha de carregamento |
| `creation.cy.js` | Carregamento inicial com resposta lenta, Fighter oficial, proficiências obrigatórias, orçamento excedido/corrigido, cavalo e besta persistidos, decisão manual obrigatória, validação de atributos e orçamento na API |
| `sheet.cy.js` | Compra na loja, salvar/recarregar, salvamento automático de combate, conflito e recarga, exportação JSON/HTML, sugestões de magia, erro de salvamento, ajuda por foco/Escape, tela móvel, atividades, seguidores, exércitos, domínio, venda de carga e exclusão da ficha |
| `campaigns-classes.cy.js` | Campanha em tela móvel e envio único, convite/aprovação/remoção/atribuição (API), calendário e atividades, classe por pontos, catálogo, permissões de jogadores e mestres alheios (API) |
| `resources-permissions.cy.js` | CRUD persistido e edição/exclusão negadas a outro jogador para armas, itens, proficiências, magias, rituais, fórmulas, pesquisas, cargas, cicatrizes, seguidores, atividades e unidades; autenticação, leitura privada, compra sem saldo (API) |
| `rules-workflows.cy.js` | Proficiência validada sem duplicação, repertório validado, XP de aventura, avanço de nível/PV, fechamento mensal, conjuração e descanso, identificação/cargas mágicas, pesquisa com materiais/trabalho/componentes/item resultante |
| `additional-workflows.cy.js` | Classes livres e tabelas (API), criação manual de Fighter e classe em uso, busca real de regras, escudo do mestre, configurações/economia/atividade individual (API), XP de tesouro sem repetição (API), venda com conflito/repetição (API) |

Mocks HTTP aparecem apenas nos casos que simulam indisponibilidade, falha de salvamento ou atraso na resposta. Não há supressão global de erros JavaScript nem repetição automática de testes que falham.

## Resultados e limites

Validação local desta entrega: **54/54 cenários Cypress** em Electron headless, **19/19 Playwright** em Microsoft Edge, **63 testes unitários de backend**, **45 de frontend** e **19 de integração** aprovados. Builds TypeScript/Vite aprovados. Nenhum caso Cypress pendente ou ignorado. O CI foi configurado, mas não executado remotamente nesta sessão.

`frontend/cypress/results/run-summary.json` registra a última execução completa ou filtrada, com totais, navegador, estado de cada caso e erros. Os arquivos JUnit em `cypress/results` e imagens em `cypress/screenshots` são artefatos ignorados pelo Git e publicados pelo CI. Execuções com falhas, casos pendentes ou ignorados retornam erro. Relatórios XML de execuções anteriores podem coexistir: use o resumo JSON para identificar a execução mais recente.

Esta matriz cobre as funcionalidades descritas, não todas as combinações possíveis de atributos, classes, equipamentos e regras dos livros. Não atesta equivalência integral ao ACKS II. Validação de impressão pelo diálogo nativo, entrega em provedores reais de e-mail, infraestrutura de produção e compatibilidade entre todos os navegadores continuam fora desta suíte. Os testes de unidade, integração e Playwright complementam essa cobertura e permanecem no CI.

As correções encontradas nesta validação incluem permissão para criar/administrar campanhas, sincronização da ficha após operações de regras, carregamento inicial da criação guiada e venda de cargas com crédito atômico e proteção contra repetição. O comércio continua uma estimativa simplificada, explicitamente indicada na tela; não implementa todas as regras mercantis do livro.
