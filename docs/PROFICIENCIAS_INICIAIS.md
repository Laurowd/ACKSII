# Escolhas e proficiências concedidas

No nível 1, as escolhas normais são **uma de classe e uma geral**, com escolhas gerais extras iguais ao bônus positivo de Intelecto. Adventuring é gratuita; o sistema inclui seus cinco testes básicos. Ela não deve ser adicionada novamente à lista de escolhas (Rulebook p. 101).

Poderes fixos equivalentes a proficiências também contam como graduações, sem gastar escolhas ou criar linhas adicionais na ficha. Por exemplo, Theology inicial do Dwarven Craftpriest conta antes da graduação comprada: o novo alvo é 4+ (11 − 4 pela segunda graduação − 3 por Attention to Detail). Diplomacy do Venturer já é concedida e não permite comprar novamente a mesma proficiência. Graduações adicionais de Manual of Arms, Siege Engineering, Collegiate Wizardry, Streetwise e Gambling seguem as permissões de suas descrições. Fichas anteriores preservam alvos editados; o mestre pode corrigi-los após conferir a graduação efetiva.

O bárbaro recebe ainda duas proficiências naturais conforme a origem cultural, independentemente da cidade natal (Rulebook pp. 49–50):

| Origem | Concessões gratuitas |
|---|---|
| Jutland | Climbing e Seafaring |
| Skysostan | Precise Shooting e Riding |
| Ivory Kingdoms | Running e Endurance |

Na criação pelas regras do livro, selecione a origem. As concessões aparecem em um grupo separado; a API acrescenta somente o par dessa origem. Se o rascunho já contém essas entradas como escolhas, selecionar a origem move a primeira graduação para o grupo gratuito e remove Adventuring redundante. Escolhas restantes são preservadas. Proficiências que permitem graduações adicionais, como Seafaring e Precise Shooting, continuam podendo receber uma escolha paga; Running e Endurance não podem ser duplicadas.

Exemplo **Tribal Warrior**: escolha Ambushing como classe e Tracking como geral, e selecione Ivory Kingdoms. Adventuring, Running e Endurance são gratuitas. Não aumente artificialmente o limite de escolhas.

O Barbarian também escolhe especialização de dano em **corpo a corpo ou projéteis** no primeiro nível. O bônus é aplicado somente ao tipo escolhido. Uma revisão posterior exige a justificativa do mestre; o avanço de nível mantém a decisão original.

Para fichas anteriores, o mestre usa **Evolução & Regras → Origem e proficiências naturais → Conferir proficiências da origem**. A prévia discrimina concessões novas, entradas que serão reclassificadas e concessões anteriores ou Adventuring redundante que serão removidas. Confirme somente depois de conferir a lista. O sistema preserva os alvos ajustados e registra a alteração no histórico. A versão da ficha protege contra alterações simultâneas, e repetir a confirmação não duplica concessões. A cidade natal nunca é usada para deduzir uma origem automaticamente.

Proficiências naturais são guardadas com categoria própria, fora dos limites de classe e geral. No editor direto de proficiências, jogadores podem ajustar um alvo de teste quando aplicável, mas não podem remover, renomear ou transformar escolhas pagas em concessões. A reclassificação de uma escolha ocorre somente pelo fluxo validado de concessões da classe, descrito abaixo. Climbing de Jutland começa em 6+ e progride como a habilidade de ladrão, preservando ajustes manuais ao avançar. Origem e concessões acompanham a exportação/importação JSON. Esta atualização não exige novas tabelas ou migrações.

## Escolhas próprias das outras classes

| Classe | Concessão |
| --- | --- |
| Venturer | Escolhe Driving ou Seafaring gratuitamente por Expert Traveling. |
| Bard | Escolhe por Jack of All Trades uma proficiência de qualquer lista de classe, uma habilidade de ladrão permitida ou um poder de Venturer permitido. Recebe novas escolhas nos níveis 3, 6, 8 e 11. Poderes e habilidades respeitam seus níveis de aquisição. |
| Dwarven Craftpriest | Escolhe um ofício equivalente a três graduações gratuitas de Craft. Mantém uma escolha normal de classe e uma geral, mais o bônus de INT. Attention to Detail é incorporado aos alvos iniciais; o ofício tem alvo padrão 2+. |
| Shaman | Escolhe um animal totêmico cujo atributo-chave seja ao menos 9. A proficiência do animal é gratuita e depende de ele estar vivo e próximo. |
| Witch | Escolhe Antiquarian, Chthonic ou Sylvan. As referências dos poderes seguem a tradição e o nível, com magia divina por estudo. Recebe a graduação própria da tradição no nível 3, ou uma alternativa permitida quando já possui a proficiência. |

Uma habilidade de ladrão escolhida pelo Bard aparece entre os poderes e testes da classe, com a progressão do nível atual. Outra graduação de uma proficiência só é aceita quando sua descrição permite. Um poder de outra classe aprovado pelo mestre precisa de nome, descrição e nível de aquisição; essa aprovação não concede conjuração.

A impressão inclui os poderes escolhidos e os testes da classe no nível atual. A tradição registrada da Witch determina seus poderes e a exportação; sua revisão é feita nessa seção, com prévia e justificativa, em vez do antigo seletor de subclasse no salvamento comum.

As concessões aparecem separadas das escolhas pagas. Na criação, selecionar uma concessão já digitada move a primeira entrada correspondente para o grupo gratuito. No avanço da Witch, uma nova graduação é acrescentada sem retirar a graduação paga que já existia.

## Conferência de fichas existentes

Em **Evolução & Regras → Escolhas próprias da classe**, preencha as escolhas pendentes e pressione **Conferir concessões da classe**. A prévia mostra inclusões, reclassificações, remoções e eventuais escolhas pagas acima do limite. Confirmar preserva os identificadores e alvos ajustados das entradas reclassificadas e registra a operação no histórico.

Jogadores podem preencher escolhas ainda não registradas da própria ficha. Somente o mestre responsável pode trocar uma escolha existente, com justificativa. Para Craftpriest, o mestre também pode conferir o bônus nos alvos antigos de Adventuring; a correção preserva o desvio manual e não aplica +3 duas vezes. Escolhas gerais adicionais feitas pelo limite antigo incorreto precisam ser conferidas pelo mestre: o sistema não decide quais habilidades remover.

As edições ainda não confirmadas ficam em rascunho local, separado por usuário e ficha. Alterações simultâneas invalidam a prévia. Uma confirmação repetida não duplica concessões.

O estado do totem pode ser registrado nessa seção. Morte ou distância desativam seus efeitos automáticos, como Combat Reflexes, Combat Ferocity e Running. As demais aplicações seguem a descrição da proficiência e os ajustes de jogo. Na morte, resolva o salvamento e eventual dano; um novo animal do mesmo tipo aparece ao ganhar um nível. As características comuns da tabela são referências e devem ser ajustadas aos HD efetivos do companheiro (Rulebook p. 70).

Escolhas, estado do totem e concessões acompanham a exportação/importação JSON. Aprovações excepcionais do mestre ficam como referências na cópia importada e exigem nova aprovação nessa ficha.

## Cálculos e referências

Expanded Repertoire aumenta em uma magia a capacidade do repertório de cada nível disponível; mantém os usos diários. Funciona também quando concedida como poder de uma classe construída. Running aumenta o movimento em 30 pés quando a armadura é média ou menor e a carga é de até 7 stones. Paladin recebe bônus de dano apenas em corpo a corpo; Ruinguard apenas com as armas especificadas pela classe.

As metas de XP do catálogo, da ficha e da evolução usam a mesma tabela conferida no livro. Decisões de progressão manual da campanha continuam disponíveis. Os poderes da Witch e do Craftpriest foram conferidos com a edição revisada, incluindo tipo de magia e níveis de pesquisa.
