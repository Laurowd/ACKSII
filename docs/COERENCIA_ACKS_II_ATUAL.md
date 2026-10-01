# Coerência com ACKS II — revisão de 28/09/2026

> Auditoria anterior à implementação. Em 29/09, as seis prioridades receberam correções e fluxos assistidos. Consulte [estado implementado e limites atuais](FLUXOS_ACKS_II.md). As ausências/erros descritos abaixo retratam a versão de 28/09.

## Conclusão e alcance

O projeto funciona como uma ficha assistida de ACKS II, com parte das regras automatizada. Ainda não é um validador completo de personagens nem uma implementação completa do sistema. Existem tanto divergências nos valores sugeridos quanto regras deixadas para preenchimento manual. Esses dois casos precisam ser tratados separadamente.

Esta revisão compara o código atual com trechos dos quatro PDFs fornecidos pelo usuário. A conferência do Revised Rulebook concentra-se em criação, classes, equipamento, combate, experiência e pesquisa mágica; a dos outros livros concentra-se no escopo e nas integrações relevantes. Não houve conferência integral de todas as tabelas, magias, proficiências, monstros ou itens. As páginas abaixo são as **páginas impressas**, não os números do visualizador do PDF (nos trechos consultados, a página do PDF é a impressa + 2).

O documento `AUDITORIA_ACKS_II.md` é histórico: vários problemas ali descritos já foram corrigidos. Esta revisão não os reapresenta como defeitos atuais. Também não equipara aprovação de testes técnicos à fidelidade às regras.

## Divergências confirmadas

### 1. Catálogo de armas sugere dano e carga incorretos — prioridade alta

- `backend/src/routes/compendium.ts:20`: Sword tem dano `1d8`, carga `1 stone` e descrição de arma de uma mão.
- Revised Rulebook, p. 299: espada média causa `1d6` com uma mão e `1d8` com duas. Pp. 17–18: uma espada comum conta como item típico de `1/6 stone`.
- `frontend/src/components/sheet/CombatTab.vue:658`: selecionar a arma do catálogo copia o dano e, se a carga ainda estiver vazia/zero, o peso para a ficha.
- Consequência: o preenchimento assistido pode superestimar dano e reduzir indevidamente o movimento. A fórmula de carga está correta, mas os dados de entrada podem estar errados.
- Correção proposta: conferir o catálogo de equipamentos e representar dano por tamanho/estilo de uso, além de carga em frações de stone. Preservar alterações intencionais do mestre.

### 2. Efeitos de classe não chegam a todos os valores calculados — prioridade alta

- `frontend/src/pages/CharacterSheetPage.vue:288`: a iniciativa passa apenas o modificador de DEX para `calculateInitiative`.
- Revised Rulebook, p. 26: Animal Reflexes dá ao Explorer +1 na iniciativa. Um Explorer sem outros modificadores e com DEX 10 deve ter +1; o cálculo atual produz 0.
- `backend/src/lib/creationRules.ts`, função `initialAdventuring`: Searching e Listening começam em 18 para qualquer classe. `backend/src/routes/characterCreation.ts` usa essa função na criação guiada.
- Revised Rulebook, p. 26: Alertness permite ao Explorer usar essas duas aplicações de Adventuring em 14+, ou concede +2 se tiver a proficiência separada.
- O texto desses poderes existe em `frontend/src/utils/classPowers.ts`, mas não altera esses resultados.
- Correção proposta: centralizar os modificadores aplicáveis por classe, nível, proficiência e equipamento, com indicação da origem de cada bônus. Conferir a acumulação de efeitos, sem aplicar duas vezes ajustes já feitos manualmente.

### 3. Poderes futuros aparecem junto dos poderes atuais — prioridade média

- `frontend/src/utils/classFeats.ts:34` carrega a lista inteira da classe e filtra por subclasse, sem filtrar por nível de aquisição.
- `frontend/src/components/sheet/CombatTab.vue:302` apresenta essa lista como “Poderes da Classe”.
- Exemplo: um Fighter de nível 1 recebe na lista Battlefield Prowess (5th level) e Castle (9th level). Os níveis estão escritos no nome, portanto isto não comprova que o sistema aplique seus benefícios antecipadamente; é uma ambiguidade de apresentação e de modelagem.
- Correção proposta: distinguir poderes disponíveis de poderes futuros, usando nível de aquisição estruturado. Evitar depender apenas do nome textual da classe para reconhecer seus efeitos.

## Regras básicas ainda dependentes do jogador/mestre

### Criação e avanço

O criador valida atributos, requisitos de classe e limites de PV iniciais, mas não valida integralmente quantidade, lista permitida, escolhas repetidas e progressão das proficiências. O livro prevê Adventuring, uma proficiência de classe, uma geral e escolhas gerais adicionais conforme INT (Revised Rulebook, p. 17). O endpoint aceita uma lista livre; o limite técnico de entradas não representa o limite das regras.

Templates, escolha inicial de magias e compras com orçamento não formam um fluxo completo. **Criar sem templates é uma opção oficial**, prevista na p. 13, com 3d6 × 10 GP e escolhas aprovadas pelo mestre. Portanto, ausência de templates é ausência do fluxo padrão, não prova de incompatibilidade por si só.

PV ao subir de nível e novas escolhas continuam manuais. A regra padrão de avanço inclui rerrolar os dados de vida do novo nível, aplicar CON conforme permitido e garantir ganho de 1 PV quando o resultado não supera o anterior (p. 311). A ficha não conduz todo esse procedimento.

### Experiência

`backend/src/routes/characters.ts:596` calcula a concessão de tesouro como `floor(gp + sp/10 + cp/100)`. O valor é registrado sem debitar as moedas, o que está correto para a natureza de XP por tesouro.

Falta um fechamento de aventura que reúna XP de monstros e tesouro, distribuição de cotas (incluindo meia cota para henchmen), ajuste pelos atributos-chave e limite de avanço por aventura (Revised Rulebook, pp. 310–311). A ação atual não aplica automaticamente essas regras. O usuário pode registrar valores preparados pelo mestre, mas isso precisa ficar explícito para não confundir valor bruto de tesouro com XP final do personagem.

### Magia e pesquisa

Os usos diários são campos editáveis (`frontend/src/components/sheet/MagicTab.vue:14`), e o cadastro de magias não constitui um validador completo de repertório, acesso por classe, nível de conjurador e progressão. As diferenças entre classes precisam ser representadas, não apenas o indicador `isSpellcaster`.

A pesquisa em `backend/src/lib/magicResearch.ts` já calcula custos de um efeito e duração, além de verificar condições básicas. Isso não cobre todo o procedimento das pp. 388–393: assistentes e dedicação, bônus de pesquisa, componentes apropriados, consumo dos recursos, restrições de duração/alvo dos efeitos e teste final quando exigido.

A taxa de pesquisa de itens limitada a 1.750 GP/dia nos níveis altos **não é um erro**: a nota da tabela da p. 388 reserva as taxas superiores para outros tipos de pesquisa. Do mesmo modo, o total que inclui trabalho, materiais e componentes não significa que tudo seja um débito em moedas: o trabalho paga a parcela de pesquisa (pp. 388–389).

## Campanha e livros complementares

- **Domínios:** há cálculo básico de receitas/despesas, mas gestão completa exige integrar população, moral, obrigações, acontecimentos e consequências ao passar do tempo. Parte disso pode continuar sendo decisão do mestre, desde que a interface declare o alcance da automação.
- **Classes personalizadas:** o editor atual permite registrar tabelas. Não implementa o construtor do Judges Journal, pp. 289–299, com pontos nas cinco categorias, trocas, custos de XP e limites raciais. São funcionalidades diferentes; um editor livre continua útil.
- **Monstrous Manual:** um bestiário completo não é requisito para uma ficha. Integrações úteis seriam XP de encontros, criaturas companheiras e componentes de pesquisa. A ligação entre componentes e pesquisa é explicitada também no Revised Rulebook, p. 389.
- **Treasure Tome:** o catálogo completo de tesouros também não é obrigatório. Para automatizar seu uso, faltam dados estruturados e fluxos de identificação, cargas, efeitos e valores de itens, além de referência textual. O livro organiza esses procedimentos e tabelas a partir das pp. 17–29.

## O que está coerente nos pontos conferidos

- Modificadores básicos de atributos.
- Sentido do cálculo de ataque contra AC: AC maior aumenta o resultado necessário.
- Capacidade máxima de personagens de tamanho humano: 20 stone + modificador de STR.
- Faixas básicas de movimento por carga e conversão de 1.000 moedas em 1 stone.
- Cura natural básica de 1d3.
- Limites raciais corrigidos e integração de tabelas de classe ao avanço, dentro do alcance documentado no README.

Executado nesta revisão: `node scripts/audit-acks.cjs`, aprovado. É uma verificação limitada de fórmulas e limites, sem acessar banco de dados. Não valida o catálogo nem todas as regras acima. Esta revisão não alterou a implementação ou fichas existentes.

## Ordem sugerida

1. Corrigir os valores de equipamentos e os modificadores de classe que já alimentam resultados exibidos como automáticos.
2. Completar criação e avanço: proficiências, repertório, usos de magia, PV e fechamento de XP.
3. Distinguir claramente na interface cálculo automático, ajuste manual e regra opcional da campanha.
4. Expandir domínios, pesquisa, classes personalizadas, bestiário e tesouros conforme o escopo desejado.

Cada correção mecânica deve ganhar casos de referência com entrada, resultado esperado e página do livro. Os casos devem verificar a regra, e não apenas repetir o comportamento atual do código.
