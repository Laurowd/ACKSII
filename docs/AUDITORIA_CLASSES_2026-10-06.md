# Classes de ACKS II — conferência de 06/10/2026

Base examinada: commit `2a4fd73ff1723522ea1f34cc6afb25b2f9f76ecb`, após a correção das proficiências naturais do Barbarian. **Os sete achados abaixo foram corrigidos na implementação subsequente**: XP compartilhado, concessões próprias de classe, efeitos de repertório e movimento, restrições de dano e referências de Witch, Craftpriest e animais totêmicos. Consulte [o fluxo implementado e a conferência de fichas anteriores](PROFICIENCIAS_INICIAIS.md). O restante deste documento preserva as evidências da versão auditada.

Fonte: `ACKS_II_Revised_Rulebook_com_bookmarks.pdf` fornecido pelo usuário. As referências usam páginas impressas; neste PDF, o número físico é a página impressa mais dois.

## Alcance

Foram comparadas as 21 classes do catálogo: XP, limites de nível, dados de vida e salvamentos, além de escolhas e efeitos específicos descritos abaixo. Reproduções locais executaram as funções atuais de validação e cálculo, sem acessar o banco. Esta conferência não certifica todas as descrições, condições, equipamentos permitidos, poderes situacionais ou combinações de proficiências. Não houve alteração das regras da aplicação nem publicação nesta auditoria.

Os limites de nível, os salvamentos comparados e os dados de vida usados pelo assistente de evolução coincidem com as tabelas consultadas. Os principais problemas estão em dados duplicados, concessões específicas e efeitos ausentes.

## 1. XP diferente entre catálogo e evolução — prioridade alta

Há 22 valores divergentes em cinco classes. Exemplos:

| Classe | Nível | Catálogo atual | Livro e assistente de evolução | Página |
| --- | --- | --- | --- | --- |
| Bard | 7 | 56.000 | 55.000 | 52 |
| Paladin | 2 | 2.500 | 2.750 | 60 |
| Dwarven Vaultguard | 5 | 17.500 | 17.600 | 84 |
| Nobiran Wonderworker | 11 | 870.000 | 770.000 | 92 |
| Zaharan Ruinguard | 9 | 415.000 | 410.000 | 96 |

Paladin diverge nos níveis 2–14; Vaultguard nos níveis 5–6; Wonderworker nos níveis 11–12; Ruinguard nos níveis 9–12. Bard diverge no nível 7.

O catálogo, o indicador de próximo nível e a exportação leem `xpPerLevel` de [seedClasses.ts](../backend/src/utils/seedClasses.ts). A autorização para avançar usa `rules.levels` de [gameRules.ts](../backend/src/lib/gameRules.ts), que está correta nesses casos. Por exemplo, um Paladin pode ver 2.500 como meta e continuar impedido de avançar, pois a operação exige 2.750.

Correção: gerar o catálogo e as metas de XP da mesma tabela conferida, incluindo as cópias de classes base feitas a partir do catálogo.

## 2. Dwarven Craftpriest: três graduações de Craft viram escolhas gerais — prioridade alta

O livro concede um ofício equivalente a três graduações de Craft, mais as escolhas normais de uma proficiência de classe e uma geral (pp. 80 e 82). O sistema adiciona `bonusGeneral = 3`, permitindo quatro escolhas gerais com INT 10. Não existe escolha estruturada do ofício gratuito.

Reprodução: Caving, Riding, Seafaring e Gambling como gerais, mais Alchemy como classe, passam por `proficiencyIssues` sem qualquer erro. Essas três escolhas gerais adicionais não substituem o Craft concedido pelo livro.

A descrição de Attention to Detail também concede +3 nos testes das proficiências aprendidas. Os valores criados por `initialAdventuring` não incorporam esse efeito. Os poderes apresentados omitem Crafting e Attention to Detail e descrevem a magia como recebida por oração, apesar de o assistente usar corretamente magia divina por estudo.

Correção: registrar o ofício e suas graduações como concessão da classe, ajustar a contagem de escolhas e conferir os alvos derivados, preservando ajustes manuais.

Código: [gameRules.ts](../backend/src/lib/gameRules.ts), [creationRules.ts](../backend/src/lib/creationRules.ts), [classPowers.ts](../frontend/src/utils/classPowers.ts).

## 3. Escolhas gratuitas de outras classes não têm fluxo próprio — prioridade alta

| Classe | Regra | Comportamento atual |
| --- | --- | --- |
| Venturer | Expert Traveling concede Driving ou Seafaring (p. 41). | A escolha entra no orçamento normal. Driving e outra geral com INT 10 produzem erro de limite. |
| Bard | Jack of All Trades permite uma proficiência de outra classe ou habilidade/poder permitido, com novas escolhas em níveis posteriores (pp. 53–54). | O poder aparece como referência. A validação exige a lista e o orçamento normais do Bard. Uma escolha de Combat Ferocity, por exemplo, é recusada por não pertencer à lista. |
| Shaman | O animal totêmico concede um benefício, exige atributo apropriado e possui regras de presença, morte e progressão (pp. 69–71). | Existe tabela de referência; não há seleção estruturada do animal, controle da condição do benefício ou concessão separada da proficiência. |

O fluxo `natural` implementado para o Barbarian ainda não cobre essas escolhas. O modo manual permite registrar decisões da mesa, mas não completa a criação conforme o livro.

Correção: modelar as escolhas próprias de cada classe e suas condições, sem cobrá-las do orçamento normal. Jack of All Trades precisa distinguir proficiência, habilidade de ladrão e poder aprovado pelo mestre.

Código: [CharacterCreationPage.vue](../frontend/src/pages/CharacterCreationPage.vue), [characterCreation.ts](../backend/src/routes/characterCreation.ts), [gameRules.ts](../backend/src/lib/gameRules.ts).

## 4. Efeitos aprendidos não alteram os cálculos — prioridade alta

- **Expanded Repertoire:** o livro acrescenta uma magia ao repertório de cada nível disponível (p. 110). Um Mage de nível 1, INT 10 e essa proficiência continua com limite 1. Arcane Armor e Auditory Illusion juntas são recusadas com “2 magias, limite 1”. O limite correto é 2; o uso diário permanece 1.
- **Running:** aumenta a velocidade base em 30 pés com armadura média ou menor e carga até 7 stones (p. 117). Em uma ficha sem armadura e sem carga, acrescentar Running mantém o movimento de exploração em 120. Deveria passar para 150.

Running afeta inclusive a concessão já corrigida do Barbarian de Ivory Kingdoms. A contagem da concessão está corrigida; seu efeito no movimento ainda falta.

Correção: aplicar os efeitos às funções compartilhadas pela criação, ficha, evolução, exportação e visão do mestre. Não confundir aumento de repertório com aumento de usos diários.

Código: [gameRules.ts](../backend/src/lib/gameRules.ts), [ruleChoices.ts](../frontend/src/utils/ruleChoices.ts), [characterMetrics.ts](../frontend/src/utils/characterMetrics.ts).

## 5. Bônus de dano indevidos — prioridade alta

`ruleProfile` usa a mesma progressão de dano para todos os tipos de ataque de certas classes. `damageBonusFor` informa +3 tanto para corpo a corpo quanto para projéteis em um personagem de nível 6:

- **Paladin:** o bônus é somente para corpo a corpo (p. 60).
- **Zaharan Ruinguard:** o bônus é para corpo a corpo com as armas especificadas na classe (p. 96).
- **Barbarian:** escolhe especialização em corpo a corpo ou projéteis no primeiro nível; a escolha não pode ser trocada ao avançar (p. 48). O criador não registra essa escolha.

A tabela de armas apresenta esse valor como bônus de classe. Correção: respeitar as restrições e registrar a especialização do Barbarian, com um procedimento do mestre para fichas existentes.

Código: [ruleProfiles.ts](../backend/src/lib/ruleProfiles.ts), [classEffects.ts](../frontend/src/utils/classEffects.ts), [CombatTab.vue](../frontend/src/components/sheet/CombatTab.vue).

## 6. Witch: descrição e tradições incompatíveis com a conjuração — prioridade alta

O livro define magia divina por estudo, Village Wisdom e uma tradição que concede poderes nos níveis 1, 3, 5 e 7 (pp. 76–78). A lógica de conjuração já utiliza `studious-divine`, mas a lista de poderes apresenta “Arcane Magic” e Familiar como concessões universais.

`getClassFeats('Witch', 1)` não retorna subclasses selecionáveis. As três tradições aparecem como referências genéricas; não selecionam nem concedem seus poderes. Também há diferença nos níveis de pesquisa: o livro permite poções no 3º nível, pesquisa de novas magias no 5º e pergaminhos no 7º.

Correção: conferir os poderes com a edição revisada e fazer a tradição determinar as concessões e seus níveis de aquisição.

Código: [classPowers.ts](../frontend/src/utils/classPowers.ts), [classFeats.ts](../frontend/src/utils/classFeats.ts).

## 7. Tabela de animais totêmicos contém números diferentes do livro — prioridade média

Exemplos na tabela de referência de Shaman (p. 69):

- Crow/Raven: o livro indica dano `1d2-1`; a tela indica `1d3-1`.
- Owl: o livro indica movimento de voo 300, HD `1/2` e dano `1d2/1d2`; a tela indica movimento 480, HD `1+1` e dano `1d3/1d3`.

Os atributos normais do animal servem como referência; suas características precisam ser ajustadas pelos dados de vida efetivos do totem conforme a p. 70.

Correção: conferir a tabela inteira e separar características normais das características efetivas do companheiro, para que a referência da ficha seja confiável.

Código: [classFeats.ts](../frontend/src/utils/classFeats.ts).

## Ordem recomendada de implementação

1. Unificar XP e corrigir as descrições que contradizem diretamente o tipo de magia.
2. Generalizar concessões de classe, começando pelo Craftpriest e pelas escolhas de Venturer, Bard, Shaman e Witch.
3. Aplicar Expanded Repertoire, Running e as restrições de bônus de dano.
4. Conferir os demais poderes e tabelas de referência, com testes baseados em exemplos do livro.
5. Preparar conferência e correção de fichas existentes, preservando decisões do mestre e exigindo prévia antes de alterar dados registrados.

Testes técnicos aprovados não comprovam, por si só, fidelidade ao livro. Na versão auditada, um teste esperava quatro escolhas gerais para Craftpriest. Esse teste foi corrigido junto com a regra, e novos casos verificam as três graduações gratuitas de Craft e os limites das escolhas pagas.
