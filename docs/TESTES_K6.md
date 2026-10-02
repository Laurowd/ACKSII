# Testes de carga com Grafana k6

Veja os [resultados de 02/10/2026](RESULTADOS_K6.md), incluindo comparação entre rodadas e achados de desempenho.

O comando `npm run test:load` mede a API em ambiente local isolado. Não utiliza a conexão definida em `backend/.env`: exige `TEST_DATABASE_URL` explícita, não aceita um banco remoto e não gera tráfego na Vercel ou no Neon. Cria um schema temporário `load_<hex>` em um PostgreSQL local chamado `acks_test`, prepara dados sintéticos, inicia a API compilada e remove seu schema e tokens ao terminar normalmente, inclusive quando encontra sobrecarga ou uma fase falha. Não apaga o schema público ou dados de outros testes.

## Preparação

Instale o [Grafana k6](https://grafana.com/docs/k6/latest/set-up/install-k6/), Node.js 24 e PostgreSQL local. No Windows, o k6 também funciona como executável portátil; esta sessão instalou a versão oficial 2.3.0 em `.audit-tools/k6`, conferindo seu SHA-256. O diretório é ignorado pelo Git.

Compile a aplicação e configure apenas o banco local de testes:

```powershell
npm.cmd run build --prefix backend
$env:TEST_DATABASE_URL = 'postgresql://acks_test:local-test-only@127.0.0.1:55439/acks_test'
$env:K6_BIN = (Resolve-Path '.audit-tools/k6/k6-v2.3.0-windows-amd64/k6.exe').Path
npm.cmd run test:load
```

Se o k6 estiver no PATH, não é necessário definir `K6_BIN`. Ajuste a porta/credenciais para seu PostgreSQL local; o banco precisa continuar se chamando `acks_test`. Não utilize a URL do Neon. O PostgreSQL deve estar iniciado antes do comando. A API de carga usa `127.0.0.1:3340`; não reutiliza o servidor de desenvolvimento.

Uma opção para preparar esse banco em uma máquina com Docker é:

```powershell
docker run --name acks-k6-db -e POSTGRES_USER=acks_test -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=acks_test -p 127.0.0.1:55439:5432 -d postgres:17-alpine
```

Aguarde `docker exec acks-k6-db pg_isready -U acks_test -d acks_test` indicar que o banco está pronto. Ao terminar, `docker stop acks-k6-db` para esse banco de testes. A senha acima é exclusiva desse ambiente local descartável.

## O que é medido

- `read`: consultas autenticadas de ficha, lista de personagens, catálogo, regras, visão do mestre, configurações e metadados. Um alvo de 100 significa 100 operações por segundo.
- `mixed`: as mesmas consultas, com 10% das operações substituídas por leitura da versão atual e salvamento de notas. Isso gera aproximadamente 110 requisições a cada 100 operações. Cada usuário virtual recebe uma ficha própria; conflitos não são mascarados como respostas bem-sucedidas.
- `sessions`: usuários virtuais carregam dados como numa sessão de uso intenso, incluindo requisições paralelas, salvamento a cada cinco ciclos e pausa de 2–4 segundos. VUs não equivalem a usuários cadastrados ou visitantes diários.

Os perfis `read` e `mixed` usam [constant-arrival-rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/), que mantém a chegada de operações independente da latência. O relatório separa operações solicitadas e requisições realmente realizadas. Iterações descartadas reprovam a fase; não são interpretadas como capacidade atendida.

Por padrão, são 200 mestres, 200 campanhas, 800 fichas, 16 itens e duas armas por ficha. Cada campanha inclui 21 cópias antigas de classes para representar o caminho de compatibilidade de campanhas existentes. Sessões e leitura de grupos usam quatro fichas por campanha. Isso representa um perfil de mestres; não é uma amostra de usuários reais.

`LOAD_MAX_VUS` controla também o tamanho dos dados: 500 gera 500 campanhas e 2.000 fichas. Compare execuções com o mesmo volume de dados; aumentar esse valor muda tanto a alocação do gerador quanto o trabalho do banco. Use `LOAD_READ_MAX_VUS` para mudar somente a alocação do perfil de leitura.

As sessões JWT são geradas previamente com segredo descartável. A API verifica autenticação e usuário no banco em cada requisição. Login e cadastro com bcrypt não são repetidos durante a carga, e seus limites por IP não são alterados. Esta medição não inclui a capacidade de autenticação inicial, envio de e-mail, importações, fechamento de aventuras ou todos os módulos de campanha.

## Critérios e controles

Antes das etapas medidas, há aquecimento de 15 segundos a 25 operações/s, registrado separadamente. Configure `LOAD_WARMUP_SECONDS` entre 5 e 60. Cada etapa medida dura 30 segundos. Leituras e uso misto começam em 10 operações/s e avançam por 25, 50, 100, 200, 400 e 800. Sessões começam em 10 VUs e avançam por 25, 50, 100 e 200.

Uma fase passa com p95 abaixo de 500 ms, p99 abaixo de 1.500 ms, erros HTTP e respostas inválidas abaixo de 1% e nenhuma iteração descartada. Cada endpoint também deve ter p95 abaixo de 500 ms. O perfil para no primeiro degrau que reprova. [Thresholds do k6](https://grafana.com/docs/k6/latest/using-k6/thresholds/) interrompem a fase durante a execução se os erros superarem 1% ou p95 superar dois segundos, após dez segundos de observação.

São critérios escolhidos para esta avaliação, não garantias contratuais. PASS mede o alvo naquela fase. LIMIT indica o primeiro degrau que reprovou; não identifica sozinho se o limite foi da API, do banco ou da máquina geradora. Se todas as etapas passam, apenas um limite inferior foi observado.

O comando termina com sucesso quando consegue concluir a investigação e gerar os relatórios, mesmo que encontre uma fase LIMIT. Para avaliar capacidade, confira a coluna Resultado e os critérios reprovados. Falhas de preparação ou execução do roteiro retornam código de erro. A duração real registrada inclui a finalização das requisições e pode ser menor que a duração-alvo quando há interrupção por sobrecarga.

Os relatórios JSON e Markdown ficam em `.audit-tools/load/<execução>/`. Incluem p95/p99 geral e por endpoint, requisições/s, erros, iterações descartadas e CPU, RAM e atraso do event loop do processo da API. CPU é expressa como percentual equivalente de um núcleo, não de toda a máquina. Logs e resultados de falhas são preservados para investigação. Não são enviados para Grafana Cloud.

Para uma execução curta de validação:

```powershell
$env:LOAD_MAX_VUS = '10'
$env:LOAD_RATES = '5'
$env:LOAD_SESSION_VUS = '5'
$env:LOAD_SECONDS = '5'
npm.cmd run test:load
```

Configurações opcionais: `LOAD_PROFILES=read,mixed,sessions`, `LOAD_POOL=3`, `LOAD_API_PORT=3340`, `LOAD_LEGACY_CLASSES=false`. Defina `LOAD_DEBUG=true` somente para diagnosticar os dados sintéticos: registra a primeira resposta inválida de cada VU. Para testar apenas consultas com menos usuários alocados, também ajuste `LOAD_SESSION_VUS` para não exceder `LOAD_MAX_VUS`.

Se aparecerem iterações descartadas em consultas, `LOAD_READ_MAX_VUS=500` permite repetir o perfil `read` com mais trabalhadores, reutilizando as mesmas contas somente para leitura. Os perfis que salvam continuam exigindo uma conta e ficha próprias por VU. Isso ajuda a separar alocação insuficiente no gerador de uma reprovação por latência ou erros da API.

## Interpretação para produção

O gerador, a API e o PostgreSQL local compartilham uma máquina. A API usa uma instância e três conexões Prisma, aproximando a configuração documentada do pool de produção. Isso mede o código com dados de teste e baixa latência de banco, não a capacidade da hospedagem.

Uma medição da Vercel + Neon precisa de staging com branch Neon isolado, as mesmas opções de compute/pool, observação de recursos e orçamento. Latência de rede, cold starts, escala, limites e consumo não aparecem no teste local. Referências: [limites das funções Vercel](https://vercel.com/docs/functions/limitations) e [pooling do Neon](https://neon.com/docs/connect/connection-pooling). O roteiro local deliberadamente recusa URLs públicas; executar carga em produção exige um roteiro e autorização separados.
