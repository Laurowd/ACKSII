# Auditoria de interações de regras — 07/10/2026

## Escopo e estado

A conferência examinou o código local atual: base `026ec584c6c5fcb345a55c759f88012509f30100` mais as correções locais descritas na [auditoria de 06/10](AUDITORIA_REGRAS_ADICIONAIS_2026-10-06.md). Não foram contadas novamente as graduações adicionais já liberadas, Theology inicial do Craftpriest, a tradição antiga da Witch, o alcance de Sense Evil, o bônus de dano mostrado na Sessão ou os limites normais de assistentes de pesquisa.

Esta rodada avaliou combinações entre editores, evolução, concessões, equipamentos e economia. Os achados abaixo foram reproduzidos na versão auditada e **corrigidos localmente em seguida, a pedido do usuário**. A evidência original continua registrada para comparação. Não houve publicação, migração ou alteração de fichas no Neon. Os livros foram usados como fontes, não como instruções de execução.

As referências são páginas impressas do Revised Rulebook e do Judge’s Journal fornecidos pelo usuário. Nos PDFs consultados, o número físico é a página impressa mais dois. A conferência não certifica todas as regras dos quatro livros.

## Ordem recomendada

| Ordem | Achado | Impacto |
| --- | --- | --- |
| 1 | Edição direta de nível ignora XP | Um jogador pode obter progressão fora do avanço validado. |
| 2 | Editor de repertório ignora fórmula e tempo de estudo | Permite aprender e conjurar imediatamente magias novas. |
| 3 | Concessões novas podem absorver graduações pagas | Uma escolha legítima é transformada em concessão gratuita, alterando sua graduação e condições. |
| 4 | Alvos de proficiências específicas e graduações gratuitas incorretos | Acrobatics/Contortionism ficam mais fáceis; Alchemy do Bard fica mais difícil. |
| 5 | Classes anãs por pontos não aplicam o bônus racial aos testes comuns | Os testes não correspondem à construção aprovada. |
| 6 | Cálculos de combate não consideram algumas condições corretamente | Iniciativa ao conjurar, bônus de escudo e Running apresentam valores indevidos. |
| 7 | Economia consolidada ignora a moral | O resumo da campanha diverge da ficha e do fechamento do domínio. |
| 8 | Pesquisa de efeitos carregados esotéricos recusada | Uma categoria permitida é bloqueada pela regra de outra categoria. |

## Estado após as correções

- Nível passou a ser uma referência somente de leitura. Evolução normal usa Avanço de nível; o mestre responsável tem Ajuste excepcional de nível, com PV, justificativa, versão e histórico, preservando XP e ferimentos.
- Jogadores acrescentam/substituem magias de estudo pelo fluxo de fórmula e semana dedicada. Repertórios por oração mantêm seu editor. Correções de estudo exigem justificativa do mestre responsável; editores manuais de magias exigem esse mesmo responsável e registram histórico. Entradas inalteradas conservam seus IDs.
- Concessões novas preservam graduações pagas. Reclassificação de legado é uma opção explícita do mestre, com justificativa. Novas graduações gratuitas consideram as anteriores e os equivalentes completos de poderes da classe.
- Acrobatics/Contortionism começam em 18+ e progridem por nível, conservando desvios manuais. Classes anãs por pontos propagam seu bônus racial; Searching/Listening raciais permanecem 14+. A conferência dos bônus antigos é idempotente e a exportação/importação preserva os registros por teste.
- Graceful Fighting entra também na iniciativa de conjuração. CA com escudo consulta o estilo da classe e concessões. Running usa a categoria da armadura, reconhecida pelo nome ou selecionada para equipamento de campanha, em vez do peso reduzido.
- Economia da campanha e fechamento mensal compartilham a receita efetiva ajustada por moral. Efeitos esotéricos com cargas não recebem a restrição dos efeitos ativados/permanentes.

Testes de correção: `backend/src/lib/ruleInteractions.test.ts`, `backend/tests/rule-interactions.cjs`, `frontend/src/utils/ruleInteractions.spec.ts` e `frontend/e2e/rule-interactions.spec.ts`. Alvos antigos editados não foram sobrescritos em lote; a ficha mostra referências para conferência. Os scripts da seção Evidências reproduzem a versão anterior e não são a suíte de regressão.

## 1. Edição direta de nível contorna o avanço por XP

Uma Mage criada com `rulesMode: standard`, nível 1 e XP 0 foi alterada pelo seu dono, de papel **PLAYER**, usando `PUT /api/characters/:id` com `level: 3`. A API retornou HTTP 200 e gravou nível 3, XP 0 e `hitDice: 3d4`.

A progressão da Mage exige **5.000 XP** para nível 3 (Rulebook p. 34); o procedimento de avanço exige XP suficiente e atualização dos PV (p. 311). O assistente de avanço faz essa conferência, mas o campo de nível também pode ser editado diretamente na interface e segue outro caminho. A edição direta verifica a faixa de níveis, sem conferir o XP ou registrar que se trata de uma exceção aprovada pelo mestre.

Correção indicada: distinguir avanço normal de ajuste manual. O avanço normal deve passar pela mesma validação de XP/PV; uma exceção deve ser apresentada e registrada como decisão do mestre. Não bloquear ajustes legítimos do mestre por confundir os dois usos.

Código: [characters.ts](../backend/src/routes/characters.ts), [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue), [CharacterSheetPage.vue](../frontend/src/pages/CharacterSheetPage.vue), [gameRules.ts](../backend/src/lib/gameRules.ts).

## 2. Editor de repertório contorna fórmula e semana de estudo

Em uma Mage nível 3 com XP 5.000, grimório vazio e somente Slumber no repertório, o dono PLAYER enviou `POST /api/game-rules/characters/:id/magic/repertoire` com Illumination (nível 1) e Ogre Strength (nível 2). A API aceitou com HTTP 200. Uma chamada de conjuração de Ogre Strength também retornou HTTP 200 e consumiu um uso de nível 2.

O histórico teve `REPERTOIRE_REPLACED` e `SPELL_CAST`, sem aquisição de fórmula ou conclusão de estudo. Esse caso foi independente da falta de XP examinada no item anterior: a ficha tinha XP/PV compatíveis com nível 3 no início da reprodução de magia.

O Rulebook p. 182 exige a fórmula e uma semana de estudo dedicado para acrescentar ou substituir uma magia do repertório de estudo. O fluxo de estudo existente aplica esses requisitos; o editor principal verifica apenas catálogo, tradição, nível e limites. Ele aparece para jogadores e não se apresenta como exceção inicial ou ajuste do mestre.

As rotas de edição manual de magias também verificam acesso à ficha, sem exigir papel MASTER, embora a interface apresente esse editor como **Exceções de magia (mestre)**. Isso reforça a necessidade de alinhar os caminhos de edição.

Correção indicada: encaminhar adições e substituições de estudo para aquisição/estudo, preservando consultas e correções administrativas explicitamente aprovadas. Magia de oração tem regras diferentes; não exigir indiscriminadamente estudo de todos os conjuradores.

Código: [gameRules.ts](../backend/src/routes/gameRules.ts), [spellLearning.ts](../backend/src/lib/spellLearning.ts), [SpellcastingPanel.vue](../frontend/src/components/sheet/SpellcastingPanel.vue), [characters.ts](../backend/src/routes/characters.ts).

## 3. Concessões novas absorvem escolhas pagas

O problema foi reproduzido em um ganho novo do Bard, não apenas em uma reconciliação de fichas antigas:

- Bard criado no modo do livro, com Jack I = Command, Performance de classe e Alchemy geral paga.
- Ao alcançar nível 3, escolhe Jack II = Alchemy.
- A API de concessões aceita, mas transforma a linha de Alchemy **general** em **natural**. Fica uma graduação de Alchemy, em vez de preservar a paga e conceder a nova gratuita.

Outro caso em funções atuais: Shaman com totem Bear e Divine Health paga recebe uma revisão para Lion. A linha paga passa a ser natural e condicional; quando o totem fica distante, a proteção paga também deixa de entrar nos efeitos. A escolha paga deveria manter sua origem independente.

A conversão de linhas antigas classificadas incorretamente pode fazer sentido no fluxo de revisão de legado, que a documentação descreve. Esse comportamento não pode ser aplicado da mesma forma a um benefício recém-adquirido quando a escolha paga já era legítima.

Fontes: Rulebook pp. 53,69,105. Código: [classChoicePlan.ts](../backend/src/lib/classChoicePlan.ts), [classAbilities.ts](../backend/src/lib/classAbilities.ts), [rotas de concessões](../backend/src/routes/gameRules.ts).

## 4. Alvos específicos de proficiências e de novas graduações gratuitas

### Acrobatics e Contortionism

A criação no modo do livro de um Thief nível 1 aceitou cada uma dessas proficiências e gravou **11+**. Ambas exigem **18+** no nível 1 e melhoram um ponto por nível (Rulebook pp. 105,109). O cálculo genérico começa em 11+, e a reconciliação de nível trata apenas Climbing e Loremastery entre as proficiências com progressão desse tipo.

As duas criações foram reproduzidas na API real do banco local.

### Alchemy concedida duas vezes ao Bard

Bard com Jack I = Alchemy recebe Jack II = Alchemy no nível 3. A API grava duas linhas naturais, ambas **11+**. A nova graduação deveria permitir identificar substâncias em **7+**, conforme a descrição expressa da segunda graduação de Alchemy (Rulebook p. 105). A concessão Jack usa graduação 1 para gerar todos os alvos.

Correção indicada: registrar o tipo de teste e sua progressão, e calcular o alvo de uma concessão nova com todas as graduações pertinentes. Preservar os ajustes manuais de linhas existentes e não inferir que toda proficiência usa o mesmo teste genérico.

Código: [proficiencyRanks.ts](../backend/src/lib/proficiencyRanks.ts), [classAbilities.ts](../backend/src/lib/classAbilities.ts), [classChoicePlan.ts](../backend/src/lib/classChoicePlan.ts).

## 5. Bônus racial de proficiência ausente em classes anãs por pontos

Foi construída uma classe anã legal com Dwarf Value 2, Hit Die 2, Fighting 2, sem magia e sem trocas. A construção concede duas escolhas gerais extras e guarda `racialValue: 2`, mas não configura `proficiencyBonus`.

| Teste | Resultado atual | Referência normal |
| --- | --- | --- |
| Theology, primeira graduação | 11+ | 9+ |
| Adventuring: Climbing | 8+ | 6+ |

Judge’s Journal p. 300 concede +1 por ponto racial nos testes de proficiência e habilidades de ladrão, com exceções para Searching/Listening raciais e afastamento de mortos-vivos. O cálculo de habilidades de ladrão já usa o bônus; os testes comuns não. O aprendizado de novas proficiências reconhece o +3 da Craftpriest oficial, mas não o valor racial de construções anãs.

Correção indicada: propagar o bônus racial e suas exceções ao mesmo perfil usado pela criação e evolução. Não aplicar uma redução adicional aos testes raciais cuja dificuldade já inclui esse conhecimento.

Código: [classBuilder.ts](../backend/src/lib/classBuilder.ts), [creationRules.ts](../backend/src/lib/creationRules.ts), [levelReconciliation.ts](../backend/src/lib/levelReconciliation.ts).

## 6. Condições de combate

### Graceful Fighting ao conjurar

Bladedancer nível 7, DEX 16 (+2), Leather e condições de Graceful Fighting habilitadas: a iniciativa normal é **+3**, mas a iniciativa ao conjurar é **+2**. O bônus de +1 foi incluído apenas na lista de iniciativa normal. O Judge’s Journal p. 307 esclarece que a iniciativa da Bladedancer vale em todas as circunstâncias; a exclusão de Animal Reflexes da iniciativa ao conjurar, em contraste, está correta.

Fontes: Rulebook p. 56; Judge’s Journal p. 307. Código: [characterMetrics.ts](../frontend/src/utils/characterMetrics.ts), [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue).

### Benefício de escudo sem o estilo

Mage com DEX 10, sem proficiências ou exceções que concedam o estilo Weapon and Shield: o cálculo apresenta **CA 0 sem escudo / 1 com escudo**. Nas regras normais, o escudo não concede o benefício a essa classe. O cálculo sempre assume o benefício, sem consultar o estilo; o ajuste manual é compartilhado pelas duas CAs e não corrige a diferença entre elas.

A saída é uma referência de CA com escudo; o problema é apresentá-la sem conferir ou indicar a proficiência necessária. Classes e concessões especiais que realmente autorizem o estilo precisam continuar sendo reconhecidas.

Fontes: Rulebook pp. 15,34. Código: [characterMetrics.ts](../frontend/src/utils/characterMetrics.ts), [mechanics.ts](../frontend/src/utils/mechanics.ts), [characterExport.ts](../frontend/src/utils/characterExport.ts).

### Running usa peso para deduzir a categoria da armadura

Um halfling com plate armor de **3,6 stones**, conforme o exemplo publicado no Rulebook p. 140, tem movimento de exploração/combate **60/20** sem Running. Ao adicionar Running, o sistema mostra **90/30**.

Plate armor continua sendo Heavy Armor (p. 128), e Running exige Medium ou mais leve (p. 117). O peso reduzido para outro tamanho não muda a categoria da armadura (p. 15). O código verifica apenas `armorWeight <= 4`.

Correção indicada: distinguir categoria da armadura de sua carga, e usar a categoria nos benefícios condicionais.

Código: [characterMetrics.ts](../frontend/src/utils/characterMetrics.ts).

## 7. Resumo econômico da campanha ignora a moral

Reprodução na API real com um único domínio: 100 famílias, receitas 3 + 4 + 2 GP por família, moral −3 e despesas de 500 GP.

| Consulta | Receita | Despesas | Saldo |
| --- | --- | --- | --- |
| Prévia do fechamento do domínio | 450 GP | 500 GP | −50 GP |
| Economia consolidada da campanha | 900 GP | 500 GP | +400 GP |

Rulebook p. 350 reduz a receita pela metade com moral −3. A ficha do domínio e seu fechamento usam esse fator. A rota de economia da campanha soma a receita bruta sem aplicá-lo. Não foi encontrada uma indicação na tela de que o saldo consolidado fosse uma projeção que deliberadamente ignora a moral.

Correção indicada: compartilhar o cálculo de receitas efetivas ou distinguir expressamente receitas nominais e efetivas, mantendo o saldo coerente com a conferência do domínio.

Código: [campaigns.ts](../backend/src/routes/campaigns.ts), [campaignRules.ts](../backend/src/lib/campaignRules.ts), [DomainTab.vue](../frontend/src/components/sheet/DomainTab.vue), [CampaignManagementPage.vue](../frontend/src/pages/CampaignManagementPage.vue).

## 8. Pesquisa bloqueia efeitos carregados esotéricos

Mage nível 9, oficina 4.000 GP, efeito conhecido Illumination nível 1 e wand com 10 cargas: a prévia rejeita `esoteric: true` com HTTP 400. Com a mesma definição e `esoteric: false`, aprova com HTTP 200, materiais de 5.000 GP e nove dias.

O Rulebook p. 391 proíbe esotéricos em efeitos ativados ou permanentes sem experimentação. A p. 392 descreve efeitos carregados como categoria distinta; Illumination aparece como esotérica na p. 186. A condição atual proíbe todos os tipos diferentes de `ONE_USE`, incluindo `CHARGED`.

Correção indicada: aplicar a restrição às categorias correspondentes, preservando os requisitos de conhecer o efeito ou possuir fórmula/amostra. Uma simples mudança de flag para contornar o bloqueio não é uma solução para o fluxo.

Código: [campaignRules.ts](../backend/src/lib/campaignRules.ts).

## Apresentação e limites de cobertura

- Climb e Stealth mostram a velocidade de combate inteira sem indicar suas penalidades. Essa velocidade é possível: escalada exige −10 e furtividade −5. Não foi classificada como movimento impossível; falta apresentar o contexto das velocidades (Rulebook pp. 108,283,294).
- Reversões de magias de estudo, como Depetrification distinta de Petrification, não têm um fluxo completo no catálogo/estudo. Isso foi registrado como cobertura incompleta, não como um novo cálculo numérico comprovadamente errado.
- Disfavor, forgetfulness e outras consequências individualizadas de magia ainda dependem do mestre. Não foram confundidas com bugs das taxas de pesquisa ou descanso.
- Mudar WIL no salvamento da ficha foi inspecionado: a API já ajusta os salvamentos preservando o desvio manual. Não foi confirmado um erro nesse caminho.

## Evidências

Validação das correções locais:

- Compilação de backend e frontend aprovada.
- 277 testes unitários aprovados: 133 no backend e 144 no frontend.
- Suíte de 111 testes de API aprovada no PostgreSQL descartável de localhost. Os nove testes novos foram repetidos após a última revisão, incluindo salvamento com nível antigo depois de um avanço: retorna conflito e preserva o nível atual.
- A primeira rodada completa do Edge executou 101 cenários: 99 passaram e dois ainda esperavam o editor de estudo para jogadores ou benefício de escudo para Mage. Após atualizar essas expectativas e conferir o fluxo de aprendizado, os 25 cenários de magia, navegação, sessão e regressões novas passaram.
- Busca com seta e filtro digitável também disponível ao registrar uma fórmula adquirida. A categoria manual da armadura fica vinculada ao equipamento; mudar seu nome exige nova conferência.

Nenhuma publicação ou alteração de fichas reais foi feita. Alvos antigos ajustados pelo mestre permanecem armazenados; referências de graduações gratuitas e de Acrobatics/Contortionism ficam disponíveis para revisão.

Scripts locais ignorados pelo Git:

- `.audit-tools/audit-20261007-api.cjs` e `.json`: nove comparações/casos pela API real, com duas contas temporárias e fichas no PostgreSQL local; removidos ao terminar.
- `.audit-tools/audit-classes-20261007.cjs`: seis casos de funções e construção de classe, sem banco.
- `.audit-tools/audit-combat-movement-20261007-subagent.cjs`: quatro reproduções de métricas e exportação, com verificação dos resultados observados.
- `.audit-tools/audit-magic-20261007-repro.cjs`: estudo/repertório/conjuração usando handlers reais com banco simulado, pesquisa esotérica e verificação de reversão ausente no catálogo.

Esses scripts reproduzem inconsistências da versão anterior à correção; resultados divergentes do livro não significam que testes de correção passaram. A fase original de auditoria não modificou a aplicação. A validação da implementação posterior está descrita acima e usa testes de regressão separados.
