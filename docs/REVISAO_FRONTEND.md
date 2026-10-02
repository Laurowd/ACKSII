# Revisão do frontend — 02/10/2026

## Revisão de estado, navegação e respostas atrasadas de 02/10

- **Cargas de itens:** consumir uma carga atualiza também o formulário de identificação. Salvar uma anotação depois da ativação não restaura cargas antigas. A sincronização preserva campos alterados localmente; valores inválidos de gasto bloqueiam a ativação e recusas da API aparecem no item.
- **Prévias e confirmações:** os formulários de XP, avanço, domínio e pesquisa ficam bloqueados durante requisições. Mudanças nos dados, na versão da ficha ou no projeto invalidam a conferência, inclusive quando uma resposta antiga chega depois da mudança. Falhas ao iniciar, trabalhar, concluir ou cancelar pesquisa e fechar um mês deixam de desaparecer sem mensagem.
- **Navegação entre registros:** mudanças de ID da ficha/campanha e de parâmetros do assistente carregam uma nova tela. A troca de ficha salva as alterações pendentes antes de sair e bloqueia a navegação se o salvamento falhar. A criação pede confirmação antes de descartar escolhas ao mudar os parâmetros; navegação por âncora conserva a tela.
- **Histórico de campanha:** o painel identifica a campanha consultada, descarta respostas de consultas anteriores e permite repetir uma consulta que falhou. Erros não aparecem como histórico vazio. O botão respeita a condição de mestre responsável exigida pela API.
- **Importação JSON:** a leitura anuncia processamento e bloqueia a confirmação. Ao substituir o arquivo, somente o último arquivo escolhido pode preencher a prévia ou apresentar um erro.

Oito novos cenários Playwright verificam persistência real e situações com respostas atrasadas, falhas de validação, edição concorrente e mudanças de rota. O build, os 74 testes unitários do frontend, os 40 cenários Playwright e os 54 casos Cypress passaram nas execuções completas. A tela de regras foi conferida também em 320 px. Os testes usam apenas PostgreSQL local, sem dados de teste no Neon.

### Próximas melhorias identificadas

1. Carregar as regras opcionais e o catálogo da ficha com erro persistente e nova tentativa. Hoje essas falhas mostram um aviso temporário e podem deixar regras padrão ou um catálogo incompleto para cálculos e exportação.
2. Ampliar a proteção de rascunhos ainda não enviados: o editor de repertório preserva fechar/reabrir a seção, mas trocar de aba pode descartar o formulário local; editores de campanha também precisam de indicação de alterações e confirmação de saída.
3. Ampliar a validação de acessibilidade e navegação para Firefox, WebKit e leitor de tela, além do Edge e Chromium já exercitados.

## Revisão de magias e proficiências de 02/10

O erro relatado permitia avançar com Seduction como proficiência de classe de Venturer e só recusava a ficha na confirmação final. A interface agora confere a lista na etapa Identidade, aponta o campo e informa quando a proficiência pertence à outra categoria. Seduction é uma escolha geral para Venturer; mudar a categoria também precisa respeitar o limite de escolhas gerais.

Foram corrigidas opções ausentes e incompatíveis em três listas do catálogo, comparando as seções de proficiências do compêndio local. A conferência de escolhas passou a cobrir limites, especializações e repetições na criação e na inclusão de proficiências pelo assistente de regras.

Magias iniciais respeitam a tradição e a disponibilidade da classe no nível 1. O assistente exige a primeira magia de estudo, confere o limite do repertório e inclui as magias na revisão. Mudanças de classe conservam as escolhas e mostram incompatibilidades para correção. Magias livres continuam disponíveis no modo manual, com justificativa.

Também foram corrigidos o descarte de rascunho ao fechar/reabrir o editor de repertório, a recuperação da lista de campanhas no catálogo e a substituição de orientações locais por mensagens genéricas. Linhas de proficiências e magias se reorganizam em celulares; campos têm nomes acessíveis e indicação de erro. Envios bloqueiam alterações simultâneas e a criação protege rascunhos ao recarregar ou fechar a página.

Validação: builds aprovados, 143 testes unitários, 40 casos de integração, 32 cenários Playwright e 54 Cypress. Os cenários incluem criação real, falhas simuladas, recuperação, compras, exportação/importação, concorrência, magia e avanço. Inspeção visual em 320 e 1440 px nos dois temas; dados de teste apenas no PostgreSQL local.

## Registro anterior — 30/09/2026

Revisão das telas de acesso, personagens, campanhas, ficha e painel do mestre, com leitura do código e testes no Edge. As correções preservam o tema visual e as regras do backend.

## Melhorias aplicadas

- Falhas ao carregar personagens, campanhas, fichas e busca de regras aparecem com opção de tentar novamente. Uma falha de rede deixa de parecer uma lista vazia ou uma tela em branco.
- O mestre pode ver todas as fichas e filtrar as que não têm campanha. O agrupamento por nome de usuário aceita nomes que coincidam com propriedades de objetos JavaScript.
- Cartões de personagens usam links acessíveis por teclado; exclusão permanece separada, visível e protegida contra envios repetidos.
- Criação e entrada em campanhas usam formulários com envio por Enter, indicação de processamento, validação do código e bloqueio de envio duplicado. Erros aparecem na própria interface.
- Login e cadastro têm rótulos associados aos campos, preenchimento automático, erros acessíveis, limites de tamanho e estado anunciado da escolha Jogador/Mestre.
- Uma sessão local com JSON inválido ou dados incompletos é descartada sem impedir a renderização da tela de login.
- Navegação com atalho para o conteúdo, foco visível, títulos por página, idioma `pt-BR`, recuperação de posição de rolagem e página 404.
- Textos secundários do tema escuro têm maior contraste. Sobre o fundo de cartão `#16213e`, os tokens `steel` e `steel-light` passaram de aproximadamente 2,11:1 e 3,96:1 para 6,28:1 e 8,35:1. Isso não certifica o contraste de todas as combinações e variantes com transparência.
- Animações e transições respeitam a preferência por movimento reduzido.
- Campanhas, filtros e painel do mestre se reorganizam em telas pequenas; a busca e as tabelas do mestre deixam de disputar colunas fixas no celular.
- A busca de regras ignora respostas atrasadas de consultas anteriores e cancela o temporizador ao sair da página. Tooltips mantêm o posicionamento durante a rolagem.

## Validação

- Build TypeScript/Vite aprovado e 41 testes unitários do frontend aprovados.
- 17 cenários de navegador aprovados ao final da correção: 16 passaram na execução completa; o cenário de ajuda apontou um problema de rolagem, corrigido e validado repetindo os quatro cenários de interface, todos aprovados.
- Cobertura nova: sessão corrompida, página 404, títulos e rótulos, acesso por teclado, filtros do mestre, falhas com recuperação, busca com respostas fora de ordem e prevenção de cadastro duplicado de campanhas.
- Inspeção visual das capturas móveis de campanhas e painel do mestre em 390 × 844.
- Contas, campanhas e personagens de teste foram criados somente no PostgreSQL local descartável. API de teste em 3109 e frontend em 4175; o Neon não foi usado nesta revisão.

## Prioridades apontadas em 30/09 (registro histórico)

1. **Feedback nas telas avançadas:** ainda há operações que apenas registram erros no console em gerenciamento de campanha e nas abas Combate, Domínio e Atividades. Migrar para mensagens contextuais e preservar claramente as alterações não salvas.
2. **Formulários da ficha:** completar a associação entre rótulos e campos, nomes dos botões de ícone e validação junto ao campo. A revisão atual cobriu os formulários de acesso e campanhas; não todos os campos da ficha.
3. **Consistência de idioma e tema:** traduzir rótulos de interface ainda misturados com inglês, preservando nomes próprios do catálogo quando necessário, e revisar cores fixas no tema pergaminho.
4. **Cobertura visual e acessibilidade:** expandir para 320 px, tablet, Firefox/WebKit e leitor de tela real. O teste de toque atual é emulado no Edge.
5. **Manutenção:** extrair formulários e estados de requisição repetidos dos componentes grandes, em mudanças separadas com testes de comportamento.

Esta revisão não é uma auditoria exaustiva de acessibilidade nem uma certificação de todos os fluxos e regras do jogo.
