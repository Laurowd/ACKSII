# Validação local — 30/09/2026

## Correção da criação guiada de 30/09

- Classes livres da campanha são identificadas na seleção, sem inferir regras pelo nome ou substituí-las por uma classe base. O assistente exige modo manual e decisão do mestre antes de avançar; oferece explicitamente a definição base de mesmo nome quando existir.
- Proficiências mínimas e PV no modo padrão são verificados na etapa de identidade. Compras incompletas e orçamento excedido são apontados na etapa de equipamento. A revisão mostra compras, origem da classe, modo e saldo em GP/SP/CP.
- Catálogos de itens e armas são carregados por tipo; falhas nas regras/equipamentos têm mensagem própria e nova tentativa.
- Build e 45 testes unitários do frontend aprovados. Três cenários de navegador aprovados no banco local: classe livre homônima a Fighter, cavalo de 75 GP + besta de 30 GP recusados com orçamento de 100 GP e aceitos com orçamento de teste de 110 GP; proficiências obrigatórias no modo padrão; fluxo completo existente de criação/compra/salvamento. Nenhuma ficha real foi criada ou alterada por esses testes.

## Revisão de navegação e formulários de 30/09

Build do frontend e 41 testes unitários aprovados. Os 17 cenários de navegador ficaram aprovados após a correção do posicionamento de ajuda durante rolagem: 16 passaram na execução completa e os quatro cenários de interface foram repetidos com sucesso após o ajuste. Foram verificados recuperação de carregamento, filtros, teclado, formulários, sessão inválida, busca concorrente e layout móvel. A API de produção não foi alterada; os testes usaram banco local. Veja [achados, melhorias aplicadas e próximas prioridades](REVISAO_FRONTEND.md).

## Revisão de interface de 30/09

- Ajuda de Magia, Combate e Domínio limitada ao botão de interrogação, com suporte a foco de teclado, Escape, toque e fechamento fora do botão. Descrições longas têm rolagem e posicionamento limitado à tela.
- Sugestões de magias, armas e itens exibem nomes. Descrições de magia ficam na ajuda, sem tooltip nativo adicional no campo. O registro de exemplo `Spell Name` foi removido do compêndio.
- Catálogos de armas e itens carregados por tipo, sem a busca de um item alterar a loja ou respostas concorrentes substituírem sugestões. A cor do botão de compra considera GP, SP e CP como a verificação de saldo.
- Erros nas operações de magia, ritual e fórmula passam a aparecer na tela; avisos têm semântica de alerta/status para tecnologia assistiva.
- Projetos de pesquisa acompanhados ficam bloqueados na edição manual, com indicação do fluxo correto. Cabeçalho e ajuda se adaptam a telas pequenas.
- Builds de backend e frontend aprovados; 63 testes unitários de backend, 33 de frontend e 10 testes de navegador aprovados (**106 testes nesta revisão**). Os testes de integração separados não foram repetidos nesta revisão; o resultado anterior permanece registrado abaixo.
- Navegador: Edge via Playwright, com mouse, teclado e emulação de toque a 390 × 844. A captura móvel também foi inspecionada. Os testes verificam persistência do nome de magia, preservação de sua tradição, mensagem de falha simulada, loja durante edição e bloqueio de pesquisa acompanhada, além dos seis fluxos existentes.

Os testes desta revisão usaram PostgreSQL local descartável e portas 3109/4175, sem interromper a API de desenvolvimento ou gravar dados de teste no Neon. Esta revisão cobre os componentes relacionados aos bugs relatados e os fluxos automatizados; não constitui auditoria exaustiva de toda a interface.

## Entrega de regras de 29/09

- Builds de backend e frontend aprovados.
- 63 testes unitários de backend e 33 de frontend aprovados.
- 18 testes de integração aprovados no PostgreSQL local descartável, incluindo as duas novas migrações e atualização de schema com preservação de fichas.
- 6 testes de navegador aprovados no Edge via Playwright: criação com proficiências, compra, conflitos e exportação; XP/avanço/domínio; magia/descanso/cargas; pesquisa com pagamento, trabalho e consumo de componentes; criação de classe por pontos.
- `node scripts/audit-acks.cjs` aprovado.

Os testes novos verificam concessão repetida de XP, avanço repetido, conjurações concorrentes, descanso insuficiente/repetido, prévia de domínio desatualizada, fechamento mensal repetido, débito único de pesquisa, períodos repetidos, coexistência com o calendário, consumo de inventário, permissões do construtor e gastos concorrentes de cargas. Consulte [fluxos e limites](FLUXOS_ACKS_II.md).

As verificações foram locais. O banco real e o ambiente público não foram alterados.

Total desta entrega: **120 testes aprovados** (63 + 33 + 18 + 6), além dos builds e da auditoria local de fórmulas.

## Verificações anteriores — 28/09

- Builds TypeScript/Vite de backend e frontend aprovados com Node 24.
- 47 testes de backend e 30 de frontend aprovados.
- 12 testes de integração aprovados em PostgreSQL 17 portátil, restrito a `127.0.0.1`, banco descartável `acks_test`.
- 2 testes de navegador aprovados no Edge via Playwright, contra o build do frontend e API/banco reais locais.
- `npm audit` sem vulnerabilidades no backend e frontend, incluindo desenvolvimento, após atualização de Vitest e override documentado de deepmerge-ts.
- YAML dos arquivos Compose/CI e sintaxe dos scripts Node validados.

Os testes exercitaram concorrência de salvamento, invalidação da versão após compra, persistência, autorização, calendário, limite compartilhado entre duas instâncias, expiração e consumo único de links, revogação de sessões, reaplicação de migrações e atualização do schema anterior preservando contas/fichas. Um servidor SMTP local capturou o e-mail e o link recebido foi utilizado para trocar a senha.

No navegador, foram verificados cadastro, criação de campanha, criação guiada, compra, salvamento/recarregamento, conflito com outra sessão, exportação JSON/HTML e logout/login. Nenhuma mensagem foi enviada a destinatários externos.

## Ainda precisa de validação externa

- Construção e execução dos containers, Caddy e backup/restauração via Docker: Docker não está instalado nesta máquina. O job `containers` do CI foi preparado para essas verificações, mas ainda não foi executado no GitHub.
- O repositório local ainda não tem commits nem remoto configurado. Revisão, versionamento e envio ao repositório escolhido precedem o CI remoto.
- DNS, emissão de certificado, SMTP do provedor, monitor externo, destinatários dos alertas e cópia dos backups fora do servidor.
- Migração/restauração de uma cópia do banco existente no ambiente escolhido. Os testes locais usaram dados novos e fixtures; não consultaram nem alteraram o Neon ou o `.env` existente.

Consulte [Implantação e operação](PRODUCAO.md) para comandos e critérios de abertura. Este registro não certifica produção pública nem valida integralmente as regras do jogo.
