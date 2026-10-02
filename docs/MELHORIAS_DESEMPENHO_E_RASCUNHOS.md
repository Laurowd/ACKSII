# Desempenho, recuperação e navegação

## Consultas e cache

A migração `20261002220000_query_indexes` adiciona índices às consultas por responsável, campanha, ficha e histórico. Ela não remove nem modifica registros. Deve ser aplicada na publicação, antes da conferência de produção.

O painel e a seleção de participantes usam `GET /api/characters?view=summary`: identidade, atributos, PV, XP, versão e responsável. Inventário, poderes e demais relações são carregados ao abrir a ficha. Sem o parâmetro, a API mantém a resposta completa para compatibilidade.

O catálogo identifica cada cópia antiga de classe uma vez por consulta. As variantes e os identificadores antigos continuam disponíveis.

Uma conferência local com quatro fichas e 16 itens por ficha, 50 amostras por formato após aquecimento, mediu 21.944 bytes na resposta completa e 1.424 bytes na resumida: **93,5% menos dados**. O p95 no Fastify com PostgreSQL local, sem transporte HTTP, foi de 6,56 ms e 3,02 ms, respectivamente. Essa comparação mede dois formatos na versão atual; não representa ganho de capacidade na Vercel nem comparação controlada com a versão anterior.

O frontend reúne consultas simultâneas aos mesmos catálogos e reutiliza metadados por cinco minutos. Classes e configurações de campanha têm validade de 15 segundos. O cache existe apenas na memória, entrega cópias independentes, é separado por sessão e campanha e é invalidado após alterações de classes, configurações e autenticação. Fichas, moedas, versões e prévias de operações não entram no cache.

## Rascunhos e conexão

Requisições do frontend têm limite de 15 segundos. Uma falha de conexão ou timeout produz orientação visível; operações de escrita não têm repetição automática.

Escolhas de criação, campos principais da ficha, repertório e requisições de editores menores que ficaram pendentes são guardados neste navegador, separados por usuário e ficha. Os campos principais registram alterações durante a digitação, antes de sair do campo. Ao voltar, o usuário decide recuperar, baixar ou descartar o rascunho. Recuperar não envia operações: é necessário usar **Salvar** ou **Salvar repertório**.

A recuperação exige a mesma versão da ficha no servidor. Se uma operação terminou no servidor e sua resposta se perdeu, a versão será diferente; o aplicativo oferece download para conferência, sem reenviar uma compra ou conjuração com uma versão nova. Requisições recuperadas conservam sua versão original. Ações sem versão não são repetidas pela recuperação; permanecem no arquivo para conferência pelo mestre.

Os rascunhos expiram após 14 dias e têm limite de dois milhões de caracteres. Dados corrompidos não impedem abrir a página. O aplicativo informa se o navegador recusar a gravação. São dados locais, sem senha ou token, e não substituem exportação ou backup do banco. Limpar o armazenamento do navegador remove esses rascunhos. Formulários auxiliares ainda não enviados, como prévias de fechamento e criação de classes, não têm recuperação persistente nesta etapa.

## Lista de personagens

A busca combina nome, classe e jogador, ignorando acentos e maiúsculas, e respeita o filtro de campanha. É possível ordenar por atualização, nome ou nível. Até seis fichas abertas recentemente aparecem como atalhos; apenas fichas ainda acessíveis na lista são exibidas. O carregamento apresenta cartões de espera, respeitando preferência por movimento reduzido.

## Monitoramento

A API emite um registro `request_metrics` por resposta, com método, padrão da rota, status, duração, tempo acumulado das operações Prisma, quantidade de operações e identificador da requisição. O campo `queries` conta operações do cliente Prisma: uma chamada com relações pode emitir várias consultas SQL. Rotas a partir de um segundo ou erros HTTP 5xx usam nível de aviso. Os registros não incluem corpo de requisição, token ou parâmetros SQL. O nível configurado em `LOG_LEVEL` pode suprimir métricas comuns.

O cabeçalho `Server-Timing` permite conferir `app` e `db` na aba de rede do navegador. `db` inclui espera do cliente Prisma e soma consultas concorrentes, podendo superar o tempo total. Ele não mede CPU exclusiva do PostgreSQL nem separa transporte de processamento. `app` mede o processamento no Fastify antes do envio e não inclui espera anterior na plataforma ou download.

O monitor horário mantém a conferência de API, conexão Neon, proteção de acesso anônimo, frontend e backup. Também mede cada resposta, publica tabela no resumo do GitHub Actions e conserva JSON por 30 dias. O limite padrão é cinco segundos; `ACKS_MONITOR_MAX_MS` aceita de 1 a 20000 ms. Falhas de disponibilidade ou demora repetidas em três tentativas reprovam o job. Configure notificações de falhas do GitHub Actions na conta que acompanha a operação. Endpoints privados são acompanhados pelos logs da API, sem credenciais adicionais no monitor.

Essas mudanças precisam ser publicadas e a migração aplicada para chegar à Vercel/Neon. Os resultados anteriores de k6 continuam registrados como medições da versão anterior; não são prova de uma nova capacidade máxima.

## Conferência local

Builds, schema Prisma, 174 testes unitários, 47 verificações de integração, 58 cenários Playwright e 54 casos Cypress aprovados. Os testes de recuperação incluem perda de resposta de uma compra já concluída, conflito entre versões, repetição manual que falha novamente e correção de um item inválido recuperado. A migração foi conferida apenas no PostgreSQL descartável. O monitor novo também passou em quatro consultas de leitura à aplicação publicada; essa conferência não incluiu teste de carga nem alteração de dados em produção.
