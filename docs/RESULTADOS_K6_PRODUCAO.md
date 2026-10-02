# k6 em produção — 2 de outubro de 2026

Alvo: **https://acksii.vercel.app**, Vercel + Neon. Implantação verificada pela CLI: `dpl_467cW7BheacFBtbqR7UWmWmifEJd`, API em `iad1`, revisão da aplicação `b2b9d5437a88d943aa42f379f6de2feec92336e9`. Não houve deploy ou alteração do código publicado durante os testes.

## Resultado observado

A campanha principal passou em **40 operações/s de consultas com salvamentos**, aproximadamente **43,4 requisições/s**, com p95 de **313 ms**. No perfil de uso intenso, **20 usuários virtuais passaram** com p95 de **337 ms**; **40 reprovaram** com p95 de **1.173 ms**. Houve reprovação inicial de consultas a 1 op/s (p95 de 1.277 ms), preservada na tabela, seguida de uma repetição apenas de consultas.

Na repetição, consultas passaram até **40 operações/s**, com p95 de **707 ms**. O teste adicionou quarenta fichas aos dados existentes por vez; não reproduziu o volume de milhares de fichas do teste local.

Não houve erros HTTP, respostas inválidas ou iterações descartadas nas etapas medidas. A reprovação foi por latência. Estes são degraus curtos observados nesta janela, não um teto garantido de usuários, requisições ou visitantes por dia. A campanha principal não buscou o limite do perfil misto além de 40 op/s.

## Método e limites

- k6 oficial 2.3.0, Windows, gerador nesta máquina, acessando o domínio público por HTTPS.
- Cada campanha de teste adicionou dez contas de mestre, dez campanhas e quarenta fichas, quatro por conta/campanha. Cada ficha tinha dezesseis itens, duas armas e duas proficiências; dez fichas de mago tinham duas magias. Foram adicionadas 21 cópias antigas de classes por campanha, representando compatibilidade com dados legados.
- As contas foram autenticadas por login na API antes da carga, dentro do limite por IP. Os VUs compartilham dez contas e salvam fichas distintas. Não houve carga de cadastro/login, envio de e-mail, deploy, migração ou alteração de índices/schema.
- Aquecimento separado: 10 segundos a 1 op/s. Campanha principal: etapas-alvo de 30s. Repetição de consultas: etapas-alvo de 20s. Os tempos reais incluem a finalização de requisições.
- Critério de aprovação: p95 geral e por endpoint < 1.000 ms, p99 geral < 2.000 ms, erros/respostas inválidas < 1%, nenhuma iteração descartada. Erros >= 1% ou p95 >= 2s interrompem a campanha; etapas ficam limitadas a 40 op/s ou 40 VUs.
- Os percentis são `http_req_duration` (envio, espera e recebimento). Incluem rede/API/banco, mas excluem estabelecimento de conexão/TLS e pausas entre ações. Conexão/TLS estão em métricas separadas nos arquivos JSON.
- O critério local anterior era p95 < 500 ms; a aprovação de produção neste critério de 1s não é equivalente à aprovação local. O volume de dados e a infraestrutura também diferem.

## Rodada 1

Início UTC: 2026-10-02T21:19:37.031Z.

| Perfil | Alvo | Duração real s | Req/s realizadas | p95 ms | p99 ms | Resultado |
|---|---:|---:|---:|---:|---:|---|
| read | 1 op/s | 30.0 | 1.0 | 1277.5 | 1931.0 | LIMIT |
| mixed | 1 op/s | 30.3 | 1.1 | 315.1 | 333.9 | PASS |
| mixed | 5 op/s | 30.3 | 5.5 | 323.3 | 343.1 | PASS |
| mixed | 10 op/s | 30.4 | 10.9 | 338.2 | 850.2 | PASS |
| mixed | 20 op/s | 30.4 | 21.8 | 329.5 | 622.3 | PASS |
| mixed | 40 op/s | 30.4 | 43.4 | 312.9 | 334.9 | PASS |
| sessions | 1 VUs | 33.7 | 1.8 | 331.3 | 677.9 | PASS |
| sessions | 5 VUs | 32.7 | 8.5 | 333.3 | 1081.3 | PASS |
| sessions | 10 VUs | 34.0 | 17.2 | 333.5 | 1112.1 | PASS |
| sessions | 20 VUs | 33.7 | 34.2 | 337.3 | 1133.4 | PASS |
| sessions | 40 VUs | 34.2 | 65.4 | 1173.3 | 1933.7 | LIMIT |

Carga k6 com aquecimento: **6868 requisições**; **173.6 MiB recebidos**. Preparação/login e verificações de saúde são adicionais.

Limpeza: **completa, zero registros temporários restantes**. Saúde após a limpeza: **OK**. As contagens globais de usuários, campanhas e fichas voltaram aos totais anteriores: **sim**.

## Rodada 2

Início UTC: 2026-10-02T21:27:11.135Z.

| Perfil | Alvo | Duração real s | Req/s realizadas | p95 ms | p99 ms | Resultado |
|---|---:|---:|---:|---:|---:|---|
| read | 1 op/s | 20.3 | 1.0 | 382.5 | 724.9 | PASS |
| read | 5 op/s | 20.2 | 5.0 | 315.0 | 330.3 | PASS |
| read | 10 op/s | 20.1 | 9.9 | 540.3 | 1291.4 | PASS |
| read | 20 op/s | 20.2 | 19.8 | 315.1 | 347.9 | PASS |
| read | 40 op/s | 20.2 | 39.6 | 707.4 | 1292.2 | PASS |

Carga k6 com aquecimento: **1534 requisições**; **35.8 MiB recebidos**. Preparação/login e verificações de saúde são adicionais.

Limpeza: **completa, zero registros temporários restantes**. Saúde após a limpeza: **OK**. As contagens globais de usuários, campanhas e fichas voltaram aos totais anteriores: **sim**.

## Onde houve lentidão

No primeiro degrau de consultas, catálogo teve p95 de 1.805 ms e lista de personagens, 1.713 ms. Com apenas trinta requisições e cerca de três amostras para alguns endpoints, os percentis por rota são frágeis; essa etapa sugere variação inicial e exige repetição.

Na etapa de quarenta sessões, as rotas lentas foram catálogo (p95 de 1.747 ms), configurações (1.637 ms), ficha (1.561 ms) e regras (1.342 ms). O salvamento de notas teve p95 de 282 ms. Esse perfil começa carregando quatro endpoints em paralelo por VU; não equivale a quarenta pessoas apenas conectadas.

Esses dados não identificam sozinhos o gargalo. Cold starts, criação de conexões/pool, escala, processamento do catálogo, consultas e percurso de rede são hipóteses que precisam ser confrontadas com métricas da Vercel/Neon. CPU, memória, instâncias e faturamento não foram medidos remotamente.

## Próximas melhorias

1. Investigar a latência inicial e as rajadas de carregamento na Vercel/Neon com métricas de instâncias e pool, distinguindo tempo da aplicação de espera na plataforma.
2. Implementar e comparar os candidatos identificados no [teste local](RESULTADOS_K6.md): índices nas relações, projeção menor na lista de personagens e classificação única das classes legadas.
3. Repetir a mesma carga/dataset e fazer um teste prolongado em staging. Planejar uma nova janela e orçamento antes de ultrapassar os alvos desta campanha.

## Segurança, limpeza e reprodução

A revisão automática rejeitou exportar todas as variáveis da Vercel. Essa ação não foi executada. A preparação utilizou somente a conexão Neon existente, em memória, e os logins retornaram as sessões normais das contas sintéticas pela API. Nenhum conjunto de segredos foi gravado ou enviado ao repositório.

A limpeza usou UUIDs gerados, conferência de identidade/propriedade e transação. Removeu fichas, campanhas, contas e auditoria do próprio teste; os arquivos temporários de tokens foram apagados. Não houve exclusão ampla nem alterações em fichas existentes.

Carga k6 total nas rodadas registradas, incluindo aquecimentos: **8402 requisições**, **209.4 MiB recebidos**. Isso não representa todo o tráfego de preparação nem uma estimativa de cobrança.

Roteiro e controles: [Testes k6 em produção](TESTES_K6_PRODUCAO.md). Arquivos completos locais, ignorados pelo Git:

- `.audit-tools/production-load/2026-10-02T21-19-37-022Z-k6_prod_97ecfd6c7fe3/`: JSON, relatório Markdown, logs e IDs sintéticos para conferência.
- `.audit-tools/production-load/2026-10-02T21-27-11-132Z-k6_prod_ec55003bad1f/`: JSON, relatório Markdown, logs e IDs sintéticos para conferência.

Este documento preserva apenas resultados agregados. Não contém senha, JWT, conexão do banco ou dados de jogadores. Referência do mecanismo de interrupção: [thresholds do Grafana k6](https://grafana.com/docs/k6/latest/using-k6/thresholds/).
