# Revisão do frontend — 30/09/2026

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

## Próximas melhorias, por prioridade

1. **Feedback nas telas avançadas:** ainda há operações que apenas registram erros no console em gerenciamento de campanha e nas abas Combate, Domínio e Atividades. Migrar para mensagens contextuais e preservar claramente as alterações não salvas.
2. **Formulários da ficha:** completar a associação entre rótulos e campos, nomes dos botões de ícone e validação junto ao campo. A revisão atual cobriu os formulários de acesso e campanhas; não todos os campos da ficha.
3. **Consistência de idioma e tema:** traduzir rótulos de interface ainda misturados com inglês, preservando nomes próprios do catálogo quando necessário, e revisar cores fixas no tema pergaminho.
4. **Cobertura visual e acessibilidade:** expandir para 320 px, tablet, Firefox/WebKit e leitor de tela real. O teste de toque atual é emulado no Edge.
5. **Manutenção:** extrair formulários e estados de requisição repetidos dos componentes grandes, em mudanças separadas com testes de comportamento.

Esta revisão não é uma auditoria exaustiva de acessibilidade nem uma certificação de todos os fluxos e regras do jogo.
