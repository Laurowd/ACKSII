# Validação local — 02/10/2026

## Estado e navegação do frontend de 02/10

- Corrigidos o reaparecimento de cargas consumidas no formulário de itens, respostas atrasadas no histórico e na importação, falhas sem mensagem nos comandos de pesquisa/domínio e o reaproveitamento da tela de uma ficha/campanha anterior ao mudar o ID na rota.
- Os formulários de regras bloqueiam edição durante conferência/envio. As prévias são invalidadas por mudanças nos dados ou na versão da ficha. A troca de ficha salva pendências e permanece na ficha anterior se houver falha; mudar parâmetros na criação pede confirmação antes de descartar o rascunho.
- Build do frontend, **74 testes unitários**, **40 cenários Playwright** e **54 casos Cypress** aprovados nas execuções completas. Oito cenários novos verificam gravação real, recusas de comandos, concorrência, respostas fora de ordem, trocas de registros e de arquivo JSON. A conferência de domínio foi inspecionada em 320 px.

Os testes usaram API isolada e PostgreSQL local `acks_test`; não há migração nova nem alteração de dados no Neon. Veja os [achados e próximas melhorias](REVISAO_FRONTEND.md).

## Escolhas iniciais e revisão do frontend de 02/10

- O assistente confere listas, categorias, especializações, repetições e limites de proficiências na etapa Identidade. Seduction continua disponível como geral; para Venturer, sua seleção como proficiência de classe é apontada junto ao campo antes da revisão ou criação da ficha.
- As listas de Venturer, Fighter e Explorer foram corrigidas usando as seções de proficiências do compêndio local do Revised Rulebook: Language e Navigation em Venturer, Intimidation em Fighter e Trapping em Explorer. Opções incompatíveis foram removidas dessas listas; fichas existentes não são alteradas.
- Magias iniciais mostram apenas tradições disponíveis no nível 1, respeitam limites e exigem a primeira magia dos conjuradores de estudo. Classes com magia tardia não oferecem magias indisponíveis. Trocar classe preserva as escolhas e pede a correção de incompatibilidades. O modo manual permite nomes de magia de campanha com decisão do mestre.
- A revisão inclui as magias escolhidas. Erros de regra retornados pela API levam à etapa Identidade, com os dados preservados. Controles ficam bloqueados durante a criação e rascunhos recebem proteção ao fechar ou recarregar a página.
- O editor de repertório confere nomes, tradições, níveis, repetições e quantidades antes de enviar. Fechar e reabrir sua seção preserva o rascunho. O catálogo tem recuperação independente para falhas ao carregar campanhas. Erros locais mostram a orientação original.
- Builds aprovados; **69 testes unitários do backend, 74 do frontend, 40 de integração, 32 Playwright e 54 Cypress** aprovados. A suíte Playwright inteira e as sete especificações Cypress passaram; capturas adicionais verificaram os formulários em 320 e 1440 px, nos temas escuro e pergaminho, com cores estáveis após a transição.

Os testes usaram API isolada e PostgreSQL descartável local, sem gravar no Neon. Não há migração nova nesta revisão. As capturas e o caso reproduzido constam em `frontend/test-results`; os relatórios Cypress ficam em `frontend/cypress/results` (artefatos locais ignorados pelo Git).

## Consistência da ficha e revisão do frontend de 01/10

- Tela, JSON e impressão usam os mesmos cálculos de CA, iniciativa e movimento; a exportação respeita a progressão manual da campanha. O caso DEX 16 com armadura de CA 2 resulta em CA 4 sem escudo nos três lugares, mesmo antes do salvamento.
- Editores de relações, compras e manutenção conferem a versão dentro da transação. Edição concorrente tem um único vencedor. Rascunhos e falhas sobrevivem à troca de aba, e tentativas de comandos com resposta incerta conservam a versão original para evitar duplicação.
- Conjuração e descanso ficam em Magia. Fechar aventura é o fluxo de XP; o endpoint antigo de tesouro recusa novas concessões. Ajustes de XP exigem mestre responsável e justificativa.
- A visão de sessão do mestre reúne PV, CA, movimento, salvamentos e magia; filtros e atualização preservam o grupo anterior quando uma requisição falha. A importação JSON cria uma nova ficha com relações e IDs novos, sem reaplicar operações financeiras; veja [portabilidade](PORTABILIDADE_FICHAS.md).
- Salvamentos comuns preservam a base manual de ataque das armas. A fila de planejamento mágico aceita linhas de texto e objetos antigos. Controles de campanha bloqueiam envios repetidos e falhas de carregamento não expõem configurações padrão como se fossem os dados atuais.
- Builds de backend e frontend aprovados, com **68 testes unitários de cada aplicação**, **39 casos de integração** e **24 cenários Playwright** verificados. Os **54 casos Cypress** foram verificados na execução completa e na repetição dos 16 casos de regras/ficha após os últimos ajustes. Os testes de integração usam exclusivamente o PostgreSQL descartável local `acks_test`. Os cenários novos cobrem importação, relações concorrentes, permissões da sessão e ajustes de XP.
- Navegação e layouts foram verificados com Edge/Playwright, mouse, teclado e toque, em 320, 390, 768 e 1440 px, nos temas escuro e pergaminho. Os testes de navegador exercitam exportação/importação, persistência de rascunhos, conflitos, falhas de salvamento e recuperação dos editores da campanha.

Não há migração nova nesta revisão. Nenhum teste criou ou alterou fichas no Neon.

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

- Configuração do remetente e credencial do provedor de e-mail para testar recuperação de senha no ambiente público.
- Domínio próprio, caso seja adotado, e preferências de destinatários das notificações operacionais.
- Guarda da chave dos backups fora desta máquina e ensaio operacional de recuperação em um banco separado.

O remoto `Laurowd/ACKSII` está configurado. Os containers e a restauração de backup já passaram no [CI anterior](https://github.com/Laurowd/ACKSII/actions/runs/36928195384); o primeiro backup automatizado do Neon passou no [workflow de backup](https://github.com/Laurowd/ACKSII/actions/runs/36928195091). Esses resultados anteriores não substituem a validação desta revisão da aplicação.

Consulte [Implantação e operação](PRODUCAO.md) para comandos e critérios de abertura. Este registro não certifica produção pública nem valida integralmente as regras do jogo.
