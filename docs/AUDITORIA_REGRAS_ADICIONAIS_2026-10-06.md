# Conferência adicional de regras — 06/10/2026

Base examinada: `026ec584c6c5fcb345a55c759f88012509f30100`, após as correções da auditoria complementar. Os resultados observados abaixo registram a versão auditada. As correções aplicadas após essa conferência estão descritas na seção seguinte.

## Correções aplicadas

- Graduações adicionais de Manual of Arms e Siege Engineering permitidas. A conferência das descrições também identificou e corrigiu Collegiate Wizardry, Streetwise e Gambling (Revised Rulebook pp. 108,111,119).
- Equivalências de poderes fixos das classes reunidas em uma fonte compartilhada pelas validações da criação, da evolução e do frontend. Theology comprada pelo Craftpriest passa a ser a segunda graduação, com alvo 4+; Diplomacy gratuita do Venturer não pode consumir uma escolha redundante. Poderes de classes construídas também entram na contagem de novas graduações.
- A aba Sessão mostra o bônus de dano da classe junto ao dano registrado, sem somá-lo novamente a textos manuais que já possam conter esse ajuste.
- A arte da Witch usa a mesma tradição resolvida dos campos antigos e das escolhas protegidas. Antiquarian no nível 3 recebe a concessão implícita de Healing; quando há três graduações anteriores, continua exigida a escolha entre Alchemy e Naturalism.
- Sense Evil do Paladin com alcance de 45 pés e condições de ativação, duração e frequência na descrição.
- Assistência de pesquisa conferida no servidor e no frontend: conjuração de estudo, nível de conjurador válido de pelo menos 5, quantidade até um mais o bônus positivo de INT, e assistentes diretos com nível de conjurador de pelo menos 1. A tela mostra o limite e impede adicionar acima dele. Exceções de Alchemy/poderes continuam no fluxo manual, já documentado.

Poderes fixos são implícitos: não criam novas linhas gratuitas no banco nem reclassificam automaticamente escolhas pagas. Alvos existentes, inclusive ajustes manuais, não são recalculados em lote. Para uma Theology antiga gravada com alvo incorreto, o editor mostra a referência 4+ junto ao alvo preservado, permitindo conferir e ajustar o valor conscientemente. A leitura de uma Witch antiga não altera sua versão nem grava novas escolhas silenciosamente.

Não há mudança de schema ou migração nesta correção. Projetos de pesquisa já iniciados mantêm seus dados; a nova validação vale para novas conferências e inícios. As evidências históricas de pesquisa abaixo descrevem o comportamento anterior.

Foram confrontados trechos dos quatro PDFs fornecidos com as funções de regras e os fluxos atuais. As referências usam as páginas impressas, duas páginas antes do número físico nos PDFs consultados. A revisão não certifica a implementação integral dos livros.

## Resultado e prioridade

| Ordem | Problema confirmado | Consequência |
| --- | --- | --- |
| 1 | Manual of Arms e Siege Engineering tratadas como proficiências de graduação única | Escolhas legais são recusadas no modo do livro. |
| 2 | Equivalências entre poderes fixos das classes e proficiências não entram na contagem | Pode gastar uma escolha sem benefício ou receber o alvo incorreto para uma nova graduação. |
| 3 | A visão de sessão omite o bônus de dano da classe | O resumo usado durante o combate apresenta informação incompleta. |
| 4 | Tradição antiga de Witch reconhecida parcialmente | Uma ficha Antiquarian pode ficar sem Healing do nível 3 e sem aviso. |
| 5 | Sense Evil do Paladin com alcance incorreto na descrição | A consulta na ficha informa 30 pés; o livro revisado informa 45. |

Existe também uma lacuna de automação na conferência de assistentes de pesquisa, descrita separadamente abaixo.

## 1. Graduações permitidas são recusadas

O Revised Rulebook p. 114 descreve graduações adicionais de **Manual of Arms**, incluindo benefícios da segunda e terceira graduações. Siege Engineering também descreve expressamente a primeira e segunda graduações na p. 118. Portanto, ambas são exceções à regra geral de graduação única da p. 101.

Reprodução pelas rotas reais: criar um Fighter com uma escolha de classe e uma escolha geral da mesma proficiência. Em ambos os casos, `POST /api/characters/guided` retornou HTTP 400 dizendo que a descrição não permite outra graduação. A lista de proficiências repetíveis não contém essas duas entradas.

Correção indicada: incluir as exceções comprovadas no catálogo de graduações e conferir as permissões a partir de todas as formas de descrição do livro, incluindo benefícios descritos como segunda ou terceira graduação. O poder gratuito Manual of Arms do Fighter também deve contar como uma graduação, conforme a p. 24.

Código: [proficiencyRanks.ts](../backend/src/lib/proficiencyRanks.ts), [gameRules.ts](../backend/src/lib/gameRules.ts), [characterCreation.ts](../backend/src/routes/characterCreation.ts).

## 2. Poderes fixos não entram na contagem de proficiências

As concessões por escolhas estruturadas, como ofício do Craftpriest, já entram na contagem. Entretanto, as equivalências de alguns poderes fixos das classes nativas não entram. As classes construídas por pontos têm outro caminho para seus poderes; a mesma conferência não reúne todas essas fontes nas classes do catálogo.

Dois casos foram reproduzidos:

- **Venturer:** sua Diplomacy inicial já equivale à proficiência (p. 40), que não permite novas graduações (p. 109). A criação no modo do livro aceitou com HTTP 201 comprar Diplomacy como escolha geral, consumindo uma vaga para repetir um benefício já concedido.
- **Dwarven Craftpriest:** Theology inicial equivale a uma graduação gratuita (p. 81). Comprar Theology deveria ser a segunda graduação: alvo 11 − 4 pela graduação adicional − 3 por Attention to Detail = **4+** (pp. 80–81,101,119). A criação foi aceita com HTTP 201, mas gravou **8+**, tratando a compra como primeira graduação.

Correção indicada: uma fonte comum para as equivalências de poderes fixos, escolhas e poderes de classes construídas. Nomes diferentes, como um poder cujo texto equivale a Theology, precisam apontar para a proficiência correspondente. A revisão de fichas antigas deve preservar ajustes manuais e mostrar a alteração proposta antes de aplicá-la.

Código: [classAbilities.ts](../backend/src/lib/classAbilities.ts), [gameRules.ts](../backend/src/lib/gameRules.ts), [levelReconciliation.ts](../backend/src/lib/levelReconciliation.ts), [ruleProfiles.ts](../backend/src/lib/ruleProfiles.ts).

## 3. Dano incompleto na visão de sessão

Foi usada a mesma ficha de Fighter nível 6, FOR 10, com Sword do catálogo e dano base 1d6. O bônus de classe nesse nível é +3 (Revised Rulebook p. 24).

| Consulta | Resultado observado |
| --- | --- |
| Geral & Combate | Dano base 1d6 e indicação separada de classe +3 |
| Impressão HTML | Indicação de bônus de dano da classe: 3 |
| Sessão | Apenas “Dano 1d6” |

O Playwright reproduziu essa diferença na versão compilada do frontend, sem erros JavaScript. As respostas da API foram simuladas a partir de uma ficha e catálogo obtidos do banco de teste local; não foi um teste autenticado em produção.

Correção indicada: apresentar na visão de sessão o bônus calculado pela mesma função de combate, separado do dano base e dos ajustes manuais. Não acrescentar indiscriminadamente bônus ao texto gravado de armas antigas, pois esse texto pode já conter ajustes.

Código: [SessionTab.vue](../frontend/src/components/sheet/SessionTab.vue), [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue), [classEffects.ts](../frontend/src/utils/classEffects.ts), [characterExport.ts](../frontend/src/utils/characterExport.ts).

## 4. Compatibilidade incompleta da tradição antiga de Witch

Reprodução: Witch nível 3 com `subclass: Antiquarian`, sem tradição gravada em `rulesState.classChoices`. A consulta de regras retorna `classChoices.tradition: Antiquarian`, mas `grantedProficiencies: []` e `issues: []`. Com a mesma tradição registrada explicitamente nas escolhas, a função concede Healing.

O Revised Rulebook p. 77 concede uma graduação de Healing por Healing Arts no nível 3, ressalvada a alternativa para quem já tem três graduações. O caso de teste não possui essas graduações prévias.

A leitura da tradição antiga usa o perfil da classe em um caminho, mas a filtragem das opções da arte tradicional não recebe esse mesmo contexto. Fichas novas com escolhas completas não reproduziram o problema.

Correção indicada: resolver a tradição uma única vez para todos os cálculos. Quando uma ficha antiga realmente precisar de conferência do mestre, informar a pendência, em vez de mostrar escolhas reconhecidas sem conceder o benefício e sem aviso. A revisão existente pode completar as escolhas; o problema é a interpretação inconsistente antes dela.

Código: [classAbilities.ts](../backend/src/lib/classAbilities.ts), [gameRules.ts](../backend/src/routes/gameRules.ts).

## 5. Descrição incorreta de Sense Evil

A descrição de Sense Evil devolvida para Paladin nível 1 informa alcance de **30 pés**. O Revised Rulebook p. 61 informa **45 pés** e também especifica linha de visão, uma rodada para ativação, duração máxima de uma rodada por nível e uso uma vez por turno.

Correção indicada: atualizar o alcance e incluir as condições de uso relevantes na descrição consultada na ficha. O alcance incorreto foi confirmado; as demais condições são informações omitidas, não valores que tenham sido calculados incorretamente pelo sistema.

Código: [classPowers.ts](../frontend/src/utils/classPowers.ts).

## Lacuna de automação: assistentes de pesquisa

O Revised Rulebook p. 390 permite assistência para conjuradores de estudo com nível mínimo 5, limitando o número de assistentes a um mais o bônus de INT. Assistência direta exige pelo menos nível 1. Um Mage nível 9 com INT 10, por exemplo, pode contar com um assistente.

O fluxo atual soma até vinte assistentes e permite nível zero. A API e a tela não validam automaticamente esses requisitos:

| Prévia de um projeto semanal, efeito nível 3 | Resultado aceito pela API |
| --- | --- |
| Mage 9, INT 10, sem assistentes | 600 GP/dia; 15 dias |
| Mesmo Mage, um assistente nível 0 | 602,5 GP/dia; 15 dias |
| Mesmo Mage, vinte assistentes nível 14 | 35.600 GP/dia; 1 dia |
| Crusader 9 de magia por oração, vinte assistentes | 35.600 GP/dia; 1 dia |

Essas prévias retornaram HTTP 200. Contudo, a tela exige a declaração **“Mestre conferiu elegibilidade, efeito, assistência e condições de trabalho”**, e a documentação descreve elegibilidade declarada. Portanto, esta rodada classifica o caso como **limitação da validação automática**, sem afirmar que o sistema prometia conferir toda a assistência.

Melhoria indicada: mostrar e conferir os limites normais conforme a classe, INT e níveis informados; separar eventuais exceções aprovadas pelo mestre, com justificativa, do cálculo padrão. Alchemy e poderes especiais têm regras próprias, também na p. 390, e não devem ser descartados por uma validação genérica de tradição.

Código: [campaignRules.ts](../backend/src/lib/campaignRules.ts), [rotas de pesquisa](../backend/src/routes/campaignRules.ts), [CampaignWorkflows.vue](../frontend/src/components/sheet/CampaignWorkflows.vue).

## Outros trechos conferidos e limites

- **Monstrous Manual pp. 392–395:** a tabela de XP usada por `monsterXp` corresponde às linhas consultadas, inclusive HD+ e o incremento após HD 21. A interface pede habilidades em asteriscos (*). Converter habilidades menores em asteriscos continua a cargo do mestre; não se deve informar a quantidade bruta de poderes.
- **Treasure Tome pp. 22,26–28:** valores de tesouro, identificação, cargas e preços dependem de avaliação em jogo. O projeto registra essas informações, sem prometer resolver automaticamente os métodos de identificação ou todo o catálogo de itens. Essa falta de automação é um limite documentado.
- **Judge’s Journal pp. 289–296:** foram consultados o processo de construção e progressões de magia, junto ao construtor e à documentação. Não se comprovou nesta rodada uma nova divergência dessas tabelas; isso não certifica todos os poderes e todas as combinações possíveis.
- **Revised Rulebook pp. 388,393:** a taxa limitada a 1.750 GP/dia para criação normal de itens e a oficina calculada pelo bônus de um item com bônus permanente correspondem às ressalvas do livro. Não foram classificadas como bugs.
- **Exceções de pesquisa:** a criação antecipada de poções por Witch e efeitos de proficiências como Alchemy ainda exigem tratamento especial/manual; a documentação já reconhece exceções de classe e proficiência. São oportunidades de ampliar a cobertura, não evidências de que todas as fórmulas atuais estejam erradas.

## Evidências e escopo dos testes da auditoria original

Foram executadas **10 sondagens de funções atuais**, **11 reproduções de rotas da API** e **uma comparação no navegador entre combate, sessão e impressão**. A comparação com os livros foi feita diretamente nos PDFs locais.

As reproduções da API usaram exclusivamente `acks_test` em PostgreSQL local. A conta e as fichas temporárias foram removidas ao final. Não foram aplicadas migrações, correções de fichas ou alterações em produção nesta rodada.

Os auxiliares e capturas ficam em `.audit-tools/`, ignorado pelo Git: `audit-additional-rules.cjs/json`, `audit-additional-api.cjs/json`, `audit-additional-ui.cjs/json` e as capturas `audit-additional-combat.png` e `audit-additional-session.png`. Não se executou novamente a suíte integral do projeto, pois o código da aplicação não foi alterado.

## Validação das correções

- 263 testes unitários aprovados: 124 do backend e 139 do frontend.
- 102 testes da API aprovados contra o banco PostgreSQL local, incluindo os nove novos casos e os fluxos existentes de criação, avanços, concessões, pesquisa, permissões e concorrência.
- 24 casos de navegador aprovados no Edge: seis novas regressões, escolhas de classe e fluxos de produção. Uma execução perdeu arquivos de trace quando a tentativa de Firefox usou o mesmo diretório de saída; o caso afetado passou novamente, isolado em outro diretório, sem alteração na aplicação.
- Builds do backend e frontend aprovados. O verificador do entrypoint Vercel, arquivos estáticos e roteamento da API passou sem acessar o banco de produção.
- Regressões permanentes: `backend/src/lib/additionalRules.test.ts`, `backend/tests/additional-rules.cjs`, `frontend/src/utils/additionalRules.spec.ts` e `frontend/e2e/additional-rules.spec.ts`. O caso da API entrou no comando `test:integration`; os novos casos de navegador também entram nas execuções de Chromium e Firefox do CI.
- A tentativa local de executar os seis casos novos em Firefox falhou ao iniciar o processo do navegador, antes de acessar a aplicação. Isso não fornece uma validação do Firefox; a execução desse navegador precisa ocorrer em um ambiente onde o binário automatizado consiga iniciar.

As correções não exigem migration. Não houve publicação ou alteração de fichas em produção durante esta tarefa.

As correções seguiram a ordem de prioridade: permissões de graduações e contagem dos poderes gratuitos, referência de combate e compatibilidade de fichas antigas, descrição de Sense Evil e conferência de pesquisa.
