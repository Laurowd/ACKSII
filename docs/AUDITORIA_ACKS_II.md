# Auditoria de coerência e consistência — ACKS II

Data: 11/09/2026.

> Atualização após as correções: este documento preserva os achados originais. A implementação corrigiu persistência de itens/proficiências, ataque, premiação de XP, preservação dos salvamentos, limites raciais, capacidade máxima, cura, CA, parâmetros de domínio e operações de compra/calendário. Criação inicial, construção de classes e pesquisa receberam melhorias parciais; ainda não constituem validação integral de ACKS II. Consulte o README para o comportamento atual e as limitações. A migração `20260911140000_acks_rules_alignment` foi aplicada ao Neon. Os números de testes abaixo descrevem a auditoria original.

O projeto tem uma boa estrutura para registrar personagens, campanhas e classes, mas ainda não deve ser considerado um criador que valida as regras de ACKS II. Há erros de cálculo e de persistência que afetam o uso em mesa. Corrigi-los deve vir antes de ampliar o catálogo ou adicionar outros subsistemas.

## Escopo e evidências

Foram extraídos os quatro PDFs fornecidos: Revised Rulebook (550 páginas), Judges Journal (478), Monstrous Manual (438) e Treasure Tome (346). A comparação foi direcionada aos subsistemas implementados; não foi uma revisão integral de cada magia, monstro, item ou linha das 21 classes.

As referências abaixo usam a **página impressa no livro**. Nos trechos citados, a página do arquivo PDF é a impressa + 2. A extração textual foi feita nos PDFs atuais; o arquivo antigo `backend/src/book.txt`, que contém referências `p. XX`, não foi tratado como autoridade para a conclusão.

Verificação executada:

- 29 testes de backend e 28 de frontend aprovados (57 no total).
- Reproduções adicionais locais, com persistência simulada, confirmaram erros de ataque, salvamentos e gravação.
- Nenhum dado do Neon foi consultado ou alterado nesta auditoria. A interface não foi testada interativamente em navegador.
- O script `scripts/audit-acks.cjs` foi atualizado para conferir os cálculos corrigidos, sem carregar o cliente do banco. Execute `node scripts/audit-acks.cjs` na raiz. As reproduções de persistência foram substituídas pelos testes de regressão em `backend/src/routes/acksCorrections.test.ts`.

## Prioridade alta: dados e regras que produzem resultados errados

### 1. Edições de inventário e proficiências não são persistidas

**Evidência:** `frontend/src/components/sheet/InventoryTab.vue:69`, `frontend/src/components/sheet/CombatTab.vue:407`, `frontend/src/pages/CharacterSheetPage.vue:322`, `backend/src/routes/characters.ts:366`.

Os campos editáveis emitem `save`, mas o salvamento principal remove `items` e `proficiencies` do payload. A API principal também não processa essas relações. Existe PUT específico para itens, mas a tela não o chama nesse fluxo; para proficiências há criação e exclusão, sem rota de atualização correspondente.

**Reprodução:** enviar uma atualização de personagem com nomes alterados de item e proficiência retorna HTTP 200 e mantém os nomes originais. Na tela, o indicador geral pode dizer que salvou, apesar de essas alterações não terem sido gravadas.

**Correção recomendada:** salvar cada entidade na rota correspondente, com resposta e erro próprios, ou implementar uma atualização agregada transacional. Verificar editar → salvar → recarregar para nome, quantidade, peso, posição e proficiência.

### 2. A tabela de ataques inverte o efeito da CA e do bônus

**Evidência:** `frontend/src/components/sheet/CombatTab.vue:506`.

O código calcula `base + attackBonus - CA`. Em ACKS II, aumentar a CA do alvo aumenta a dificuldade; bônus positivos ao ataque diminuem o alvo necessário no dado. A forma equivalente é `base + CA - bônus aplicáveis`.

**Reprodução:** base 10, bônus 0 e alvo CA 6 produzem **4** no projeto; o valor correto é **16**. Um bônus positivo de +1 atualmente piora o número necessário, quando deveria melhorá-lo. Também falta integrar de modo explícito STR/DEX e modificadores de estilo, magia e condições, evitando contar o mesmo bônus duas vezes.

**Fonte:** Revised Rulebook, pp. 295–296, Conducting an Attack e Melee Attacks.

### 3. Tesouro está sendo gasto para conceder XP

**Evidência:** `backend/src/routes/characters.ts:475`, principalmente os decrementos das moedas.

A regra concede XP por tesouro elegível recuperado em aventura e levado à civilização. Ela não exige gastar esse tesouro para receber XP. Atualmente, conceder 100 XP por 100 PO remove as 100 PO do personagem. A implementação também trata o saldo de moedas como evidência suficiente de elegibilidade, sem distinguir tesouro novo de salários ou dinheiro já premiado.

**Correção recomendada:** registrar uma premiação com origem, valor elegível, participantes e identificação única. Conceder XP sem debitar dinheiro e impedir a repetição da mesma premiação. Contemplar divisão de XP, ajustes por atributos-chave e as regras particulares de venda de itens mágicos não utilizados.

**Fonte:** Revised Rulebook, pp. 310–311, Earning Experience from Adventures.

### 4. Salvamentos ajustados são sobrescritos pela progressão

**Evidência:** `backend/src/lib/classCatalog.ts:38`, `backend/src/routes/characters.ts:16`, `frontend/src/pages/CharacterSheetPage.vue:356`.

A progressão grava os salvamentos-base da classe diretamente nos campos finais. O modificador de WIL, que afeta todos os salvamentos, não é aplicado. A ficha envia nível e classe no salvamento geral; por isso um ajuste manual de salvamento volta ao valor-base ao salvar até uma edição sem relação com ele.

**Reprodução:** Fighter de nível 1, WIL 18 e salvamento contra morte informado como 11 volta a **14** após o PUT. O alvo-base 14 com bônus +3 corresponde a 11 no dado.

**Correção recomendada:** separar base da classe, modificadores permanentes, efeitos temporários e ajuste do mestre. Mostrar como o total foi calculado; recalcular sem destruir ajustes.

**Fonte:** Revised Rulebook, p. 14, Will; p. 25, Fighter Attack and Saving Throws; p. 10, interpretação de bônus e valores-alvo.

### 5. Classes raciais estão estendidas até o nível 14

**Evidência:** `backend/src/utils/seedClasses.ts:2508`, `:2675`, `:2842`; `backend/src/routes/characters.ts:399`.

Todas as 21 classes cadastradas possuem 14 linhas de progressão, e a API usa o comprimento da tabela como nível máximo. Entretanto, Dwarven Craftpriest termina no nível **10**, Dwarven Vaultguard no **13** e Elven Nightblade no **11**. Assim, a validação aceita níveis além dos previstos para essas classes.

**Correção recomendada:** incluir `maxLevel` e conferir as tabelas raciais individualmente. Não truncar fichas existentes automaticamente: identificar as afetadas e apresentar a decisão ao mestre. Preservar classes personalizadas que deliberadamente adotem outros limites.

**Fonte:** Revised Rulebook, pp. 80, 84 e 86; Judges Journal, p. 299, Custom Racial Classes.

## Criação de personagens e classes

### 6. O assistente atual é um preenchimento guiado, com validação parcial de regras

**Evidência:** `frontend/src/pages/CharacterCreationPage.vue:77`, `:99`; `backend/src/routes/characterCreation.ts:7`.

Diferenças em relação à criação padrão:

- Atributos: o padrão escolhe um atributo para 5d6, mantendo os três maiores e mínimo 13; outros dois usam 4d6, mantendo três e mínimo 9; os três restantes usam 3d6. O projeto oferece 3d6 para todos. A própria tela o condiciona à aprovação do mestre, mas falta oferecer o método padrão.
- Classes: faltam requisitos estruturados, incluindo mínimo 9 nos atributos-chave e requisitos raciais/adicionais. É possível escolher uma classe sem satisfazê-los.
- Templates: faltam os templates iniciais de classe, com rolagem 3d6 e opção de escolher resultado inferior. Escolha manual sem templates é uma variante prevista, mas o fluxo atual não distingue essa variante do padrão.
- Proficiências: o personagem pode começar sem Adventuring, sem as escolhas iniciais de classe/geral e sem os acréscimos de INT. Faltam listas de escolhas legais e progressão de proficiências.
- PV: começam como entrada manual com valor inicial 1. Faltam a regra inicial de mínimo 4 no dado antes de CON, as variantes e a progressão com rerrolagem dos dados e garantia de avanço. O código mantém `hitDice` como tipo de dado, sem representar toda a progressão de HD e bônus fixos após o 9º nível.
- Magia: selecionar Mage não configura por si só a capacidade de conjuração, slots e repertório. `isSpellcaster` é um checkbox independente, e os slots são campos livres.

**Fontes:** Revised Rulebook, pp. 13–18, 23 e seções de cada classe. Opções de campanha devem permitir exceções explícitas sem apresentar a exceção como regra básica.

### 7. O criador de classes não implementa a construção do Judges Journal

**Evidência:** `frontend/src/pages/CampaignManagementPage.vue:194`, `backend/src/routes/classes.ts` e `backend/prisma/schema.prisma`, modelo CustomClass.

O editor atual cadastra tabelas e texto; isso é útil para importar uma classe já aprovada, mas não calcula uma classe segundo as regras de construção. Essa limitação é reconhecida na interface.

O Judges Journal usa distribuição de pontos em Hit Die, Fighting, Thievery, Divine e Arcane; trocas de proficiências de combate e poderes; progressões derivadas; custos de XP; regras raciais; lista de proficiências; e opções de fortaleza e seguidores. Para humanos, o ponto de partida é distribuir quatro pontos; classes raciais adicionam sua categoria e seus limites específicos.

**Fluxo recomendado para uma implementação fiel:**

1. Conceito e raça/base.
2. Distribuição dos pontos de construção.
3. Armas, armaduras e estilos de combate.
4. Poderes, habilidades, trocas e níveis de aquisição.
5. Magia, requisitos e proficiências.
6. Revisão com XP, salvamentos, HD, limite de nível e referências calculadas.

Manter também o editor manual para regras da mesa. Registrar poderes por ID e nível de aquisição. Hoje `classFeats.ts` busca poderes pelo nome da classe e seleciona subclasse, mas não filtra toda a lista textual por nível; copiar e renomear uma classe não herda automaticamente esses poderes, conforme já avisado na tela.

**Fonte:** Judges Journal, pp. 289–299 e seções raciais seguintes. O critério de desempate para salvamentos e os ganhos após o 9º nível precisam ser modelados, não inferidos pelo nome da classe.

## Outros cálculos e fluxos inconsistentes

### 8. Carga tem faixas corretas, mas pesos e capacidade estão incompletos

**Evidência:** `frontend/src/utils/mechanics.ts:52`, `backend/src/routes/compendium.ts:20`.

As faixas 5/7/10 stone, as velocidades 120/90/60/30 e 1.000 moedas por stone estão coerentes. Porém, não há limite máximo em função de STR: até **100 stone** resultam em movimento de 30. O máximo humano padrão é 20 + modificador de STR.

O compêndio usa Sword = 1 stone, enquanto o livro dá uma espada típica como exemplo de 1/6 stone. Outros pesos precisam de revisão por item e por pacote. Recipientes exibem capacidade, mas não a impõem. Armas podem ser registradas simultaneamente como item e arma, produzindo dupla contagem; criar uma arma pelo assistente a insere no inventário, não na lista de ataques.

**Fonte:** Revised Rulebook, pp. 17–18. Para montarias, familiares e criaturas transportadoras, o Monstrous Manual, p. 13, distingue carga normal, máxima e efeito na velocidade.

### 9. Recuperação natural calculada não corresponde à regra

**Evidência:** `frontend/src/utils/mechanics.ts:101`, `frontend/src/pages/CharacterSheetPage.vue:281`.

O campo automático usa `máximo(1, 1 + CON)`. A regra de recuperação natural usa **1d3 PV por dia completo de descanso** em condições adequadas, com interferências, proficiência Healing e limitações de ferimentos graves. O teste atual apenas confirma a fórmula implementada, sem validar a fonte.

**Fonte:** Revised Rulebook, p. 301, Healing; p. 112, Healing proficiency.

### 10. CA equipada e bônus não têm cálculo unificado

**Evidência:** `frontend/src/pages/CharacterSheetPage.vue:270`, `frontend/src/components/sheet/CombatTab.vue:154`.

A CA sem armadura usa DEX; as demais são lidas de campos manuais. Alterar `armorAcBonus` ou DEX não recalcula a CA equipada. A função utilitária `calculateAC` possui testes, mas não é a usada nesse cálculo da ficha. Classes e proficiências que afetam CA/iniciativa também precisam ser incorporadas com condições de equipamento.

**Correção recomendada:** exibir composição do total e uma opção explícita de ajuste manual. Garantir que ficha, exportação e API usem a mesma definição.

### 11. Domínio perde parâmetros e usa uma economia simplificada incompatível com o padrão

**Evidência:** `frontend/src/components/sheet/DomainTab.vue:281`, `backend/src/routes/characters.ts:1067`.

O formulário envia `peasantFamilies`, `revenuePerFamily` e `taxRate`, mas o upsert não os inclui. A reprodução retornou HTTP 200 com os três campos descartados. Além disso, `taxRate || 20` converte imposto zero em 20%.

A receita atual é famílias × receita-base × percentual × modificador de moral. A regra distingue terra (3–9 PO/família), serviços (4), impostos (normalmente 2) e tributos. Com 100 famílias e terra de valor 6, essas três receitas somam 1.200 PO de valor antes das despesas; o cálculo atual com 20% mostra 120. Receitas de serviço e terra não devem ser confundidas automaticamente com caixa líquido.

**Fonte:** Revised Rulebook, pp. 341–342, Collecting Revenue e Paying Expenses. O modificador genérico de ±10% por moral usado no código deve ser substituído pelas regras específicas aplicáveis.

### 12. Pesquisa de itens mágicos usa custos e prazos simplificados

**Evidência:** `frontend/src/components/sheet/MagicTab.vue:404`, `backend/src/routes/characters.ts:823`.

A tela calcula consumível = nível × 500 PO/uma semana e permanente = nível × 10.000 PO/uma semana por 1.000 PO. O livro distingue custos de componentes, materiais e pesquisa, efeitos por carga/frequência/duração, bônus de equipamento e requisitos do pesquisador. Os 500 PO por nível são uma parcela do custo de efeito de uso único, não justificam sozinhos o campo de custo total atual.

Faltam validação de nível/capacidade do conjurador, fórmula/amostra, biblioteca/oficina, componentes e resolução da pesquisa. Regras opcionais exibidas na interface não substituem validação na API.

**Fontes:** Revised Rulebook, pp. 390–393; Treasure Tome, pp. 26–28, para identificação, valores e negociação de itens. Não foi conferido cada item individual desses livros.

### 13. Compras e passagem de tempo precisam de operações integradas

**Evidência:** `frontend/src/components/sheet/InventoryTab.vue:182` (função `buyItem`), `backend/src/routes/campaigns.ts:485`.

Na compra, moedas são descontadas em memória, o item é criado por uma requisição e o saldo salvo em outra. Uma falha pode deixar dinheiro e item incoerentes. A operação deve ocorrer no servidor, em transação, com validação de saldo e preço.

A passagem de semanas atualiza `CampaignActivity`, mas não a fila `CharacterActivity` nem a pesquisa dos personagens. Custos e consequências de concluir atividades não estão integrados. O mestre pode avançar a campanha e continuar vendo prazos antigos nas fichas.

## O que já está coerente e deve ser preservado

- As 21 classes nomeadas do Revised Rulebook estão representadas; a auditoria não confirmou todas as suas tabelas.
- Modificadores básicos de atributos conferem com a tabela do livro.
- A amostra de Fighter conferida (XP, ataque e salvamentos-base) coincide com as tabelas das pp. 24–25. O problema dos salvamentos aparece na composição e na gravação de modificadores.
- Classes base disponíveis sem campanha; classes personalizadas vinculadas à campanha; vínculo por identificador e proteção ao renomear/excluir.
- Autorização e validações possuem testes; esses testes não equivalem a uma auditoria completa de segurança.
- A criação inicial de ficha e escolhas usa uma única operação de persistência.
- Exportação JSON e impressão são úteis; falta importação validada e versionamento de regras para recuperação e intercâmbio.

## Sequência recomendada

1. **Confiabilidade:** persistência de itens/proficiências/domínio, compras transacionais, erros visíveis e salvamento que corresponda ao que realmente foi gravado.
2. **Regras básicas:** ataque, XP por tesouro, composição de salvamentos, carga, recuperação natural e limites raciais. Acrescentar casos de teste derivados das páginas citadas.
3. **Criação oficial:** método padrão de atributos, templates, requisitos, PV, proficiências, repertórios e distinção explícita entre padrão e variantes da campanha.
4. **Construção de classes:** implementar os pontos e derivação do Judges Journal, mantendo o cadastro manual para exceções.
5. **Campanha avançada:** economia de domínio, pesquisa, calendário compartilhado, seguidores e integração opcional de monstros e tesouros.

O Monstrous Manual e o Treasure Tome oferecem oportunidades para companheiros/montarias com atributos próprios, componentes de pesquisa, tesouros identificados/não identificados, cargas e XP de encontros. Esses recursos são expansões úteis; a ausência de um bestiário completo, por si só, não é um defeito em um projeto cujo foco é a ficha de personagem.

Não há motivo identificado nesta auditoria para trocar Vue/Fastify/Prisma ou aumentar muito as dependências. O maior retorno está em uma definição estruturada e versionada de regras (ID, edição, livro, página, campos e efeitos), compartilhada entre API, assistentes, ficha e exportação. A infraestrutura já existente é suficiente para começar essas correções.
