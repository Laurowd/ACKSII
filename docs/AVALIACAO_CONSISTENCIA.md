# Avaliação de consistência — 02/10/2026

Estado avaliado: commit `699cb57`. Revisão do código do frontend, dos endpoints relacionados e reprodução com Edge/Playwright, API isolada e PostgreSQL local `acks_test`. As falhas de rede foram simuladas no navegador. Nenhum dado do Neon foi alterado.

Foram reproduzidas seis inconsistências no commit indicado. Os achados abaixo preservam o diagnóstico original; a seção final registra as correções implementadas após aprovação do usuário.

## Prioridade 1 — dados e decisões de jogo

### 1. Comércio permite marcar uma venda sem liquidá-la

Em **Atividades e Downtime**, uma carga de 100 GP com mercados III → I foi marcada como **Sold** pelo seletor de status. A API aceitou a alteração, mas o saldo continuou em 0 GP e o lucro em 0 GP. O botão **Sell** desapareceu. Uma tentativa de liquidar a carga pelo endpoint de venda retornou 409: “Esta carga já foi vendida.”

O botão de venda, por sua vez, usa uma operação que credita o retorno e grava histórico. O seletor e o botão representam a mesma ação para o usuário, mas têm efeitos diferentes. A proteção contra crédito duplicado existe; o problema reproduzido é concluir o registro sem receber o retorno.

**Correção proposta:** concluir vendas exclusivamente pela operação de liquidação. Exibir o status como resultado da operação e separar ajustes excepcionais com explicação. Proteger também a API de atualização comum contra mudanças que contradigam uma venda liquidada; prever recuperação de registros já marcados como vendidos sem histórico de liquidação.

Código: [seletor de status](../frontend/src/components/sheet/ActivitiesTab.vue), funções `saveVenture` e `sellVenture`; [endpoints de comércio](../backend/src/routes/characters.ts).

### 2. Falha nas configurações muda a progressão exibida/exportada

Foi criada uma campanha com **Progressão automática por classe** desativada e uma ficha Fighter com XP do próximo nível de **7.777**. A exportação normal preservou 7.777. Ao simular uma resposta 503 no carregamento das configurações e recarregar a ficha, a exportação passou a indicar **2.000**. O banco continuou com 7.777.

A ficha reinicia as regras opcionais com todos os valores ativados. Se o carregamento falha, mostra um aviso temporário e continua usando esses valores. O catálogo de classes tem tratamento semelhante de erro, embora a divergência numérica reproduzida nesta avaliação seja a das configurações.

**Correção proposta:** distinguir configuração carregada, carregando e indisponível; oferecer erro persistente e nova tentativa. Enquanto os dados necessários estiverem indisponíveis, não apresentar cálculos dependentes como definitivos nem exportá-los como se as regras da campanha fossem conhecidas.

Código: [carregamento e exportação da ficha](../frontend/src/pages/CharacterSheetPage.vue), funções `loadCampaignOptionalRules`, `loadCampaignClasses` e `exportSheet`.

### 3. Proficiências possuem caminhos com validações diferentes

Uma conta **PLAYER** adicionou **Seduction** como proficiência de classe de Venturer em **Geral & Combate**. A atualização retornou 200 e a escolha permaneceu no banco. Ao tentar adicionar uma escolha pelo assistente de **Evolução & Regras**, este recusou a lista por conter Seduction na categoria incompatível e por ultrapassar o limite de classe.

O assistente de criação já impede a seleção incompatível, mas a edição direta da ficha permite recriar o mesmo problema. Ela também aparece ao jogador sem indicação de ajuste excepcional.

**Correção proposta:** usar a mesma validação para escolhas normais na criação e na ficha. Permitir ajustar o alvo do teste sem confundir isso com uma nova escolha de proficiência. Se a mesa precisar de uma exceção de nome, categoria ou limite, apresentá-la em um fluxo explícito do mestre, com a correspondente regra no servidor.

Código: [editor direto de proficiências](../frontend/src/components/sheet/CombatTab.vue), função `saveProficiency`; [assistente validado](../frontend/src/components/sheet/RulesAssistant.vue); [endpoints de proficiências](../backend/src/routes/characters.ts).

## Prioridade 2 — previsibilidade e preservação de trabalho

### 4. Rascunho do repertório desaparece ao trocar de aba

No editor validado, o nome **Slumber** foi alterado para **Arcane Armor** sem enviar o formulário. A ficha não indicou alterações pendentes. Ao ir para Inventário e voltar para Magia, o editor voltou a mostrar **Slumber**, sem confirmação de descarte.

Fechar/reabrir a seção na mesma aba preserva o rascunho. Trocar a aba desmonta o componente e elimina o estado local do formulário; esse estado não participa do controle de pendências da ficha.

**Correção proposta:** manter o rascunho no estado da ficha, identificar alterações ainda não enviadas e integrar esse estado à proteção de navegação. Verificar também o editor de identificação de itens e os formulários de classes/campanha, que possuem estados locais; a perda nesses outros editores não foi reproduzida nesta rodada.

Código: [estado do editor](../frontend/src/components/sheet/SpellcastingPanel.vue), `repertoire` e `onEditorToggle`; [montagem condicional das abas](../frontend/src/pages/CharacterSheetPage.vue).

### 5. Resumo do domínio diverge do fechamento mensal

Com 100 famílias, receitas normais de 900 GP, despesas de 500 GP, moral **−3** e tesouro suficiente, a aba Domínio exibiu **Net Profit / Month: +400 GP**. O fechamento mensal mostrou receita de **450 GP**, despesas de **500 GP** e saldo de **−50 GP**.

O resumo calcula receitas integrais. O fechamento aplica a redução por moral negativa. Logo, o valor rotulado como lucro mensal não corresponde ao resultado da operação no mesmo estado do domínio, mesmo sem tributo ou outros ajustes.

**Correção proposta:** compartilhar o cálculo dos fatores conhecidos entre resumo e fechamento. Identificar explicitamente o que depende de decisões do mês, como tributo, e rotular a estimativa com suas condições.

Código: [resumo do domínio](../frontend/src/components/sheet/DomainTab.vue), `netProfit`; [fechamento mensal](../backend/src/lib/campaignRules.ts), `settleDomainMonth`.

### 6. A opção de carga avançada não muda o cálculo da ficha

Em uma campanha com **Encumbrance avançada** desativada, uma ficha carregando 8 stone continuou calculando movimento em combate de **20 pés**. O cálculo e a exportação não recebem essa opção. A configuração é oferecida no gerenciamento, mas não controla esse comportamento.

**Correção proposta:** definir e implementar o comportamento da opção desativada ou retirar a opção até que ela tenha efeito. Não inventar um modo alternativo de carga implicitamente. Revisar o alcance das demais opções: algumas controlam apenas funções no gerenciamento da campanha e outras afetam a ficha.

Código: [opções oferecidas](../frontend/src/pages/CampaignManagementPage.vue), `optionalRuleOptions`; [métricas da ficha](../frontend/src/pages/CharacterSheetPage.vue); [cálculo compartilhado](../frontend/src/utils/characterMetrics.ts).

## Aparência e acessibilidade

- As seis abas foram abertas em 320 px; a largura do documento permaneceu em 320 px e não ocorreram exceções JavaScript nos cenários executados. Isso não verifica todas as combinações de tabelas preenchidas, diálogos e textos longos.
- Domínio e Atividades ainda misturam rótulos, botões e explicações em inglês e português. Exemplos: `Save Domain`, `Sold`, `Sell`, `Net Profit / Month`. Padronizar esses textos ajuda a distinguir comandos, estimativas e registros.
- Há rótulos visuais sem associação programática ao campo. A inspeção do DOM contou 25 controles em Geral & Combate, 5 no Inventário, 11 em Magia e 19 em Domínio sem `label` associado ou atributo ARIA de nome. Alguns possuem placeholder ou title; o número não equivale a uma auditoria completa de nomes acessíveis. Corrigir a associação e conferir com teclado/leitor de tela.
- As tabelas de seguidores, tropas e comércio exigem rolagem horizontal no celular. Uma apresentação por cartões pode facilitar a edição, mantendo a tabela compacta no desktop.

## Evidências e alcance

Os seis comportamentos foram confirmados por ações na interface e leitura posterior pela API. Houve um sétimo cenário de inspeção de largura/rótulos. O resumo e as capturas locais ficam em `frontend/test-results/consistency-audit` (diretório ignorado pelo Git). O script auxiliar fica em `.audit-tools/consistency-audit.cjs`.

A CI do commit avaliado passou, incluindo 74 testes unitários do frontend, 43 cenários Playwright e 54 Cypress. Esses testes continuam úteis, mas não cobriam os casos acima. Ao corrigir cada problema, os cenários de reprodução devem virar testes que exijam o comportamento esperado, em vez de apenas constatar o defeito.

Esta avaliação cobre consistência da interface e de operações relacionadas; não revalida integralmente os quatro livros de ACKS II nem certifica todos os fluxos, dispositivos ou tecnologias assistivas.

## Correções implementadas

1. **Comércio:** o status passou a ser um resultado da liquidação. A API bloqueia atalhos por status/lucro e protege os valores vendidos. Vendas manuais antigas ou importadas podem ser reabertas somente pelo mestre responsável, com motivo auditado e sem alterar moedas; uma liquidação registrada impede reabertura.
2. **Contexto da campanha:** catálogo e configurações carregam juntos. Falhas deixam um aviso persistente e bloqueiam edição/exportação até uma nova tentativa bem-sucedida. Progressão manual com XP seguinte de 7.777 foi preservada nos testes de falha em ambas as consultas.
3. **Proficiências:** escolhas do jogador usam a mesma conferência de listas e limites no servidor. A ficha direciona a inclusão ao assistente validado, permite ajustar alvos e identifica os controles livres do mestre como exceções. Poderes de aventura não podem ser renomeados ou excluídos pelo jogador.
4. **Repertório:** o rascunho fica na ficha, sobrevive à troca de abas e integra os avisos de navegação. É possível descartá-lo explicitamente ou exportá-lo no JSON. Uma tentativa de recuperação de envio preserva digitação posterior; importação não aplica escolhas pendentes automaticamente.
5. **Domínio:** a tabela de fatores de moral é compartilhada entre tela e fechamento. A estimativa informa a exclusão de tributos e ajustes futuros. Foram comparados os saldos com moral −4, −3, −2 e 0.
6. **Carga:** a opção sem efeito foi retirada da interface e dos padrões de campanhas novas. Valores antigos armazenados não alteram o cálculo; carga/movimento continuam usando a regra existente da ficha, sem um modo alternativo implícito.

Rótulos e botões de Domínio/Atividades foram padronizados em português, os campos alterados receberam nomes acessíveis e o comércio usa cartões no celular. As demais associações de rótulos e as tabelas móveis de seguidores/tropas continuam oportunidades de melhoria; esta rodada não afirma uma revisão completa de acessibilidade.

As reproduções viraram cenários permanentes em `frontend/e2e/consistency.spec.ts`, `frontend/e2e/interface.spec.ts` e nos testes de integração do backend. Os testes usam banco local descartável; não há migração nova nem alteração de dados no Neon nesta correção.

Validação local: builds de backend/frontend, 69 testes unitários do backend, 74 do frontend, 43 testes de integração e 48 cenários Playwright passaram. O módulo compartilhado também foi carregado pelo servidor de desenvolvimento do Vite. O build Docker do frontend passou a usar o contexto da raiz, com uma lista restrita em `.dockerignore`, para incluir somente o frontend e a tabela de fatores necessária.

## Revisão do catálogo e criação de classes

A revisão seguinte conferiu o capítulo de classes personalizadas do Judge’s Journal, pp. 289–306, e as tabelas relacionadas do Revised Rulebook. O catálogo reconhece as cópias antigas das classes base sem apagar registros e mantém variantes reais. Os IDs antigos continuam utilizáveis nas fichas; classes raciais usam o limite oficial da entrada base.

O botão **Criar classe** voltou ao catálogo. O construtor foi ampliado com trocas de poderes encadeadas, aquisição por nível, magia adiada, código de conduta e repertório religioso, habilidades de ladrão e halflings. Classes personalizadas com o mesmo nome de uma classe oficial não herdam seus poderes por engano. Poderes da classe são compartilhados com a ficha e a impressão; a descrição aparece pela interrogação na interface.

Detalhes, referências e decisões que permanecem com o mestre: [Criação de classes](CRIACAO_CLASSES.md). Não há migração nova nem alteração de dados no Neon.

Validação desta revisão: builds de backend/frontend, 79 testes unitários do backend, 81 do frontend, 46 testes de integração, 51 cenários Playwright e 54 Cypress passaram. Os novos cenários verificam duplicações, referências antigas, criação pela interface, poderes futuros, falhas de carregamento, invalidação de prévias e layout móvel. A cobertura não certifica o equilíbrio dos poderes inventados pelo mestre.
