# Fluxos de regras — 01/10/2026

As seis prioridades da revisão receberam correções e fluxos assistidos. A ficha continua permitindo ajustes do mestre; isso não equivale à automação integral dos quatro livros.

## Equipamentos e efeitos de classe

Catálogo de 22 armas com preço, carga e alcance conferidos na p. 126 do Revised Rulebook; equipamentos básicos nas pp. 128–130. Espada usa 1d6 com uma mão, 1d8 com duas e carga de 1/6 stone. Compras novas usam o catálogo. Armas antigas só entram nesse modo ao selecionar **Usar valores do catálogo**; editar o dano desliga a atualização automática.

Perfis de classe fornecem iniciativa, bônus de dano e limite de cleaves, com indicação de origem e iniciativa ao conjurar. Graceful Fighting/Swashbuckling aparecem com suas condições, para composição nos ajustes manuais. Poderes com nível de aquisição indicado ficam separados entre atuais e futuros. Searching/Listening iniciais do Explorer, elfos e anões usam 14+.

## Criação e evolução

**Novo personagem** oferece o modo do livro e o modo de ajustes do mestre, com justificativa. O primeiro confere listas/limites de proficiências, PV, requisitos e magias iniciais. A opção de equipamento usa orçamento de 3d6 × 10 GP e desconta compras em cobre, preservando o troco.

**Evolução & Regras → Avanço de nível** usa as progressões das 21 classes, XP mínimo, nova rolagem de todos os dados de vida, CON por dado, bônus fixo após nível 9 e ganho mínimo de 1 PV. Preserva ferimentos e ajustes de salvamentos. Exibe prévia e permite preencher escolhas pendentes.

Fontes: Revised Rulebook pp. 13–17, descrições de classes, pp. 102–104 e 311; dados em `backend/src/data/acksRules.json`.

## Magia

**Magia → Conjuração e descanso** é o caminho principal: separa usos por tradição e nível, repertório de estudo e repertório religioso. As 396 combinações de magia/tradição/nível das pp. 186–189 estão em `spellAccess.json`, independentemente das descrições antigas do compêndio.

**Conjurar** e **Registrar descanso** atualizam o servidor. Descanso exige novo dia de jogo e declaração de 8 horas de sono, intervalo de 24 horas e requisitos de estudo/oração. Não infere passagem de tempo real. A referência manual de usos fica em uma seção recolhida disponível ao mestre; não altera o saldo calculado.

Repertórios religiosos dependem da ordem definida pelo mestre. Magias de campanha, efeitos que ampliam repertórios, especializações e requisitos individuais não têm validação exaustiva. O mestre pode usar **Repertório manual e exceções** para essas entradas; os jogadores podem consultá-las. Fichas antigas conservam suas magias e idiomas. Não há fluxo de templates ou automação completa de aprendizado/troca por estudo.

## Fechamento de aventura

Reúne tesouro elegível e monstros derrotados (HD, HD+ e habilidades especiais), divide cotas inteiras/meias, aplica ajuste de atributos-chave e limita XP ao ponto anterior ao segundo avanço na mesma aventura (pp. 310–311).

O mestre fecha aventuras de campanha; fichas avulsas podem ser fechadas pelo proprietário. O identificador da aventura é único. Todos os participantes são atualizados juntos, sem movimentar moedas. Henchmen precisam de ficha própria para participar; o cadastro simples de seguidores não tem XP individual.

**Inventário & Tesouro → Fechar aventura** leva a este fluxo. A antiga conversão direta de tesouro em XP foi desativada, para que um tesouro não seja premiado em dois registros independentes. XP acumulado na aba Geral & Combate é somente leitura. Correções excepcionais usam **Evolução & Regras → Ajuste excepcional de XP (mestre)**, com valor positivo/negativo e justificativa registrada no histórico.

## Domínio, pesquisa e itens

- **Fechamento mensal:** calcula receitas, despesas, efeitos da moral, capacidade populacional, teste de moral e tesouro. Impede fechar o mesmo ano/mês duas vezes. O mestre informa moral base, crescimento/perdas já rolados, eventos, repressão e tributo. Prestígio, revoltas, mudanças de classificação, vassalos e inadimplência permanecem decisões da mesa. Avançar o calendário não fecha o domínio implicitamente.
- **Pesquisa acompanhada:** parte da fila de Magia. Confere conjurador/oficina, elegibilidade declarada e restrições do efeito; soma assistentes e dedicação. Paga materiais no início, registra períodos únicos de trabalho, consome componentes do inventário e resolve o teste final. Fórmula com componentes adequados dispensa teste; 1–3 naturais falham quando ele é exigido. Trabalho paga a parcela de pesquisa, sem outro débito de moedas. Cancelar preserva histórico e não devolve materiais.
- Projetos acompanhados avançam por registros de trabalho; o calendário não lhes concede dias adicionais. Projetos antigos/manuais mantêm o comportamento anterior. Múltiplos efeitos, experimentação, construções, criação de criaturas e rituais usam o fluxo manual.
- **Identificação e cargas:** registra identificação feita em jogo, efeito, valor aparente/identificado e cargas. O gasto é atômico e não permite saldo negativo. Itens carregados precisam de entradas com uma unidade. Notas e dados mágicos são separados. Não rola identificação, não determina preços e não aplica efeitos automaticamente ao combate.

Fontes: Revised Rulebook pp. 340–351 e 388–393. Componentes integram inventário e pesquisa; HD/habilidades integram encontros e XP. Não foi importado um bestiário ou catálogo completo de tesouros.

## Classes por pontos

**Campanhas → Gerenciar → Construir classe por pontos** calcula cinco categorias, custos/trocas iniciais, XP, salvamentos, ataque, PV, magia, limite racial, orçamento de proficiências e fortaleza elegível. Inclui humanos, anões, elfos, nobiranos e zaharanos. Fontes: Judge’s Journal pp. 289–306; tabelas de magia em `customMagic.json`.

O mestre descreve poderes e define seleções específicas de armas/estilos e benefícios raciais/condicionais. Trocas por níveis futuros, novas raças, variantes de conjuração e poderes de fortaleza não são calculados integralmente. Classes calculadas preservam a definição; **Editar** abre uma cópia manual, que não conserva as automações da construção. O editor livre permanece disponível.

## Persistência e atualização

Aplicar antes de iniciar a API atualizada:

```sh
cd backend
npx prisma migrate deploy
npx prisma generate
npm run build
```

Migrações novas: `20260929100000_rule_workflows` e `20260929110000_magic_item_state`. São aditivas e preservam fichas, danos manuais, notas e magias. Não convertem retroativamente os valores antigos para o catálogo.

Operações de regras e editores de itens, armas, proficiências, magias, rituais, fórmulas, cicatrizes, seguidores, domínio, atividades, unidades e cargas comerciais conferem a versão da ficha. O servidor altera a relação e a versão na mesma transação. Domínio e pesquisa também conferem registros associados antes da confirmação.

O salvamento da ficha e as pequenas alterações são coordenados: cada operação salva primeiro os campos principais e usa a versão atual. Falhas de conexão ou indisponibilidade deixam o rascunho pendente mesmo após trocar de aba; **Salvar** tenta novamente. Campos inválidos dos editores também ficam pendentes até serem corrigidos. Comandos rejeitados ou prévias expiradas exigem corrigir os dados e conferir uma nova prévia. Um conflito entre duas sessões exige revisar/exportar o rascunho e carregar a versão atual antes de prosseguir. Respostas do servidor preservam textos e campos editados enquanto a solicitação estava em andamento.

Testes usam exclusivamente `TEST_DATABASE_URL` apontando para `acks_test` em localhost. Consulte [validação](VALIDACAO_PRODUCAO.md) e [implantação](PRODUCAO.md). Nenhuma migração desta entrega foi executada no banco real.
