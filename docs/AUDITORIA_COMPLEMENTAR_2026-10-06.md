# Conferência complementar de regras — 06/10/2026

## Correções aplicadas

Os sete achados abaixo foram corrigidos. A descrição dos problemas preserva a reprodução na versão auditada, para comparação.

| Achado | Comportamento corrigido |
| --- | --- |
| Troca de classe e nível | Revisão com prévia e confirmação pelo mestre responsável. Remove concessões antigas ou mantém exceções explicitamente aprovadas; conserva saldos, escolhas pagas e ajustes manuais. Edição de nível e avanço guiado compartilham a atualização de habilidades. |
| Weapon Finesse | Armas elegíveis permitem escolher STR, DEX ou o melhor atributo. Combate, sessão e impressão usam o mesmo cálculo. Armas livres sem tamanho identificado exigem conferência manual. |
| Ataque e dano | Uma mesma classificação por estilo/alcance determina o atributo e o bônus de dano da classe. |
| Warlock | Dark Path obrigatório no modo do livro; poderes separados por caminho e nível, graduação gratuita no nível 3 e vaga restrita de repertório no 7. Tipos das 396 entradas do catálogo seguem as tabelas do livro; homebrew pode ser classificada pelo mestre. |
| Graduações | A descrição determina se uma proficiência pode ser repetida. Craftpriest pode adquirir a quarta graduação do ofício com uma escolha paga. |
| Nightblade | Climbing usa 7 − nível, incluindo alvos zero e negativos. |
| Bladedancer | Poderes sem duplicações ou descrições de Priestess; oração por uma hora ao amanhecer ou ao anoitecer. |

Fichas antigas não são reescritas em lote. O mestre pode usar **Geral & Combate → Revisar classe e concessões**; benefícios naturais sem origem válida não entram em efeitos automáticos até serem conferidos. Exceções aprovadas não recebem aprovação automática ao importar uma cópia JSON. A migration `20261006190000_weapon_ability_spell_types` acrescenta o atributo de ataque e os tipos das magias de campanha, sem alterar fichas existentes.

Regressões: `backend/src/lib/complementaryRules.test.ts`, `frontend/src/utils/complementaryRules.spec.ts`, `backend/tests/class-choices.cjs` e `frontend/e2e/class-choices.spec.ts`.

## Evidências da versão auditada

Base examinada: `0fe053821cc4539d810525009b85520dd431636e`, após a publicação das correções anteriores. Fonte: `ACKS_II_Revised_Rulebook_com_bookmarks.pdf` fornecido pelo usuário. As páginas abaixo são as impressas; neste PDF, o número físico é a página impressa mais dois.

Esta rodada comparou cálculos de combate, proficiências, poderes e habilidades ainda fora da conferência anterior, além dos caminhos de troca de classe e edição direta de nível. Foram executadas 13 reproduções em funções atuais e cinco reproduções da API em fichas fictícias de um PostgreSQL local descartável. As fichas fictícias foram removidas ao terminar. Os achados abaixo são problemas confirmados; não foi feita uma certificação integral de todas as regras e descrições do livro.

## 1. Troca de classe e edição direta de nível deixam concessões incoerentes — alta

O seletor de classe da ficha altera `classKey`, `className` e `subclass`, mas preserva `rulesState` e as proficiências naturais. A API atualiza as tabelas de progressão, sem reconciliar as escolhas anteriores.

Reprodução: trocar um Barbarian de Ivory Kingdoms para Fighter foi aceito com HTTP 200. Running, Endurance e `damage-specialization: melee` continuaram registrados. O cálculo do Fighter ainda apresentou movimento de exploração 150, enquanto a conferência de regras acusou concessões inválidas. O personagem não deveria conservar automaticamente concessões da classe anterior; uma decisão de manter benefícios precisa ser explícita e conferida pelo mestre.

Outro caminho divergente: editar diretamente o nível de um Barbarian de Jutland de 1 para 2 foi aceito, mas Climbing permaneceu em 6+, em vez de acompanhar a progressão para 5+. O fluxo de avanço em Evolução & Regras contém a atualização; o campo de nível não passa por ele. A referência dessa progressão está nas pp. 30 e 49–50.

Correção recomendada: revisão de classe com prévia, tratamento explícito das concessões antigas e preservação de ajustes legítimos. Alterações de nível precisam compartilhar a reconciliação dos efeitos, inclusive quando o mestre usa progressão manual.

Código: [CharacterSheetPage.vue](../frontend/src/pages/CharacterSheetPage.vue), [characters.ts](../backend/src/routes/characters.ts), [classAbilities.ts](../backend/src/lib/classAbilities.ts), [gameRules.ts](../backend/src/routes/gameRules.ts).

## 2. Atributo de ataque não considera Weapon Finesse — alta

O livro permite à Bladedancer usar DEX nos ataques corpo a corpo com suas armas permitidas (p. 57). Weapon Finesse também concede essa escolha para armas corpo a corpo tiny, small e medium (p. 121).

A tabela automática de ataques decide o atributo somente pelo estilo/alcance da arma. Ela não consulta a proficiência nem o poder da classe.

Reprodução: Bladedancer com FOR 10, DEX 16, Sword, estilo Arma única e ataque base 10 produz alvo 10+ contra CA 0. Ao optar por Weapon Finesse, o alvo deveria ser 8+. A coluna de atributo continua mostrando STR +0; o campo Outros orienta a não incluir FOR ou DES.

Correção recomendada: permitir escolher o atributo autorizado pelo poder, respeitando tipo de arma e preservando os bônus manuais separados. Não supor que um poder opcional precisa sempre substituir STR.

Código: [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue), [mechanics.ts](../frontend/src/utils/mechanics.ts).

## 3. Estilo automático classifica ataque e bônus de dano de maneiras diferentes — alta

Para determinar o atributo do ataque, o estilo vazio usa o alcance da arma. Para o bônus de dano da classe, a tela considera projétil somente quando `style === 'Missile Weapon'`.

Reprodução: um Longbow com estilo vazio e alcance curto 120 usa DEX no ataque. Em um Paladin de nível 6, a mesma linha apresenta bônus de classe +3 no dano, apesar de o bônus do Paladin ser apenas para corpo a corpo (p. 60). Esse caso afeta especialmente armas antigas e a opção visível Automático pelo alcance. A restrição funciona quando Arma de projéteis está selecionada explicitamente.

Correção recomendada: usar a mesma classificação de ataque nos cálculos de atributo e de dano. Armas arremessáveis devem respeitar o modo de uso selecionado.

Código: [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue), [mechanics.ts](../frontend/src/utils/mechanics.ts), [classEffects.ts](../frontend/src/utils/classEffects.ts).

## 4. Warlock não tem seleção funcional de Dark Path — alta

O livro exige escolher Demonology, Necromancy ou Transmogrification na criação, e o caminho determina os poderes dos níveis 1, 3, 5, 7, 9 e 11 (pp. 73–74).

`getClassFeats('Warlock', 7, 'Demonology')` não oferece subclasses selecionáveis e retorna também os poderes de Necromancy e Transmogrification. Os nomes indicam caminhos, mas os dados não têm a associação estruturada usada para filtrar os poderes. A criação guiada pelas regras do livro aceita um Warlock sem caminho: reprodução com HTTP 201 e subclasse vazia.

O Expanded Repertoire do caminho, adquirido no nível 7, também não participa da capacidade calculada. Um Warlock de nível 7, INT 10 e caminho Demonology continua com capacidade 3 para magias de primeiro nível. O livro concede 4, incluindo a vaga adicional, que deve conter uma magia de conjuração/invocação. Os outros caminhos têm restrições próprias para a vaga adicional. A correção anterior de Expanded Repertoire cobre a proficiência registrada e poderes estruturados de classes construídas; não cobre esses poderes de caminho presentes apenas no texto.

Correção recomendada: escolher e persistir o caminho, filtrar poderes por caminho e nível, incorporar as concessões e modelar a restrição das vagas adicionais. Fraquezas corruptoras, usos de poderes e demais decisões da campanha também precisam ficar claramente identificados como registros manuais enquanto não houver um fluxo específico.

Código: [classPowers.ts](../frontend/src/utils/classPowers.ts), [classFeats.ts](../frontend/src/utils/classFeats.ts), [classAbilities.ts](../backend/src/lib/classAbilities.ts), [gameRules.ts](../backend/src/lib/gameRules.ts).

## 5. Validação de graduações é incompleta e bloqueia a quarta Craft do Craftpriest — alta

A regra geral permite selecionar uma proficiência apenas uma vez, salvo autorização na descrição (p. 101). A implementação proíbe repetições de uma lista parcial de nomes, permitindo repetir outras proficiências que não concedem novas graduações.

Reprodução: o endpoint de escolhas validadas de um Mage de nível 5 aceitou duas Diplomacy gerais, criando duas linhas com HTTP 200. A descrição de Diplomacy não autoriza repetições (p. 109). O orçamento de escolhas cabe; a repetição é o problema.

Há também uma restrição introduzida na última atualização: Craftpriest recebe corretamente três graduações gratuitas, mas a validação impede gastar uma escolha normal para adquirir a quarta no mesmo ofício. Art/Craft permite expressamente quatro graduações, incluindo grand master (p. 107). A reprodução na criação guiada retornou HTTP 400 para Craft gratuito e uma escolha geral no mesmo ofício.

Correção recomendada: representar permissões, especializações e graduações por proficiência, contando também concessões equivalentes. Corrigir o limite de Craft sem restaurar o antigo bônus incorreto de três escolhas gerais. Conferir alvos e benefícios por graduação, sem sobrescrever ajustes manuais.

Código: [gameRules.ts](../backend/src/lib/gameRules.ts), [ruleChoices.ts](../frontend/src/utils/ruleChoices.ts), [classAbilities.ts](../backend/src/lib/classAbilities.ts).

## 6. Climbing do Elven Nightblade usa uma progressão errada — média

O erro está na tabela de habilidades, fora das tabelas de XP, dados de vida, ataque e salvamentos conferidas anteriormente.

| Nível | Sistema | Livro, p. 87 |
| --- | --- | --- |
| 3 | 5+ | 4+ |
| 6 | 4+ | 1+ |
| 11 | 2+ | −4+ |

A função `getClassFeats` reproduziu essas divergências. A ficha e a impressão usam a mesma tabela incorreta.

Correção recomendada: conferir as tabelas de habilidades especiais diretamente com o livro, com casos de referência independentes da implementação.

Código: [classFeats.ts](../frontend/src/utils/classFeats.ts).

## 7. Bladedancer contém poderes duplicados e textos de Priestess — média

No nível 1, `getClassFeats('Bladedancer', 1)` apresenta Divine Magic e Theology duas vezes. Uma das cópias descreve Priestess. A fonte inclui ainda pesquisas duplicadas nos níveis posteriores, referências `p. XX` e instruções de comportamento antigas que precisam ser conferidas com a edição revisada (pp. 56–57).

Correção recomendada: separar os poderes por classe e conferir suas descrições, níveis, condições e referências. A presença correta de um título não garante que o conteúdo da descrição pertença à classe.

Código: [classPowers.ts](../frontend/src/utils/classPowers.ts), [classFeats.ts](../frontend/src/utils/classFeats.ts).

## Limites e próxima ordem

Primeiro, corrigir troca de classe/nível, atributo de ataque e classificação do ataque. Em seguida, completar Dark Path e as regras de graduações; depois corrigir tabelas e descrições restantes.

Uma ficha assistida pode manter efeitos situacionais e decisões do mestre como registros manuais. Isso é diferente dos problemas acima: aqui há valores automáticos divergentes, opções válidas bloqueadas, opções inválidas aceitas ou referências contraditórias. Strength of Faith, por exemplo, ainda depende de aplicar WIL ao dano manualmente; o campo de dano declara que apresenta a base por estilo, portanto isso foi tratado como limite de automação, não como prova de um dano total calculado incorretamente.

As verificações aprovadas da versão anterior continuam demonstrando os cenários cobertos. Elas não certificam todo o sistema de ACKS II: o caso que bloqueava uma quarta graduação de Craft demonstra por que é necessário conferir a expectativa dos testes com o livro.
