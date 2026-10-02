# Resultados de carga com k6 — 2 de outubro de 2026

Aplicação medida: `b2b9d5437a88d943aa42f379f6de2feec92336e9`. k6.exe v2.3.0 (commit/e088784614, go1.26.8, windows/amd64). Os scripts de teste foram adicionados depois dessa revisão; o código da aplicação permaneceu igual durante todas as rodadas.

## Conclusão

A API respondeu sem erros HTTP nos perfis medidos, mas houve reprovações por latência e por operações que o gerador não conseguiu iniciar. Os resultados variaram bastante entre rodadas e entre o início e o fim de uma execução. Não há evidência suficiente para declarar um teto estável de usuários ou requisições, especialmente para Vercel + Neon.

Os números abaixo são degraus observados, não garantias. O perfil misto chegou ao maior alvo configurado na rodada gradual; portanto, o teste não encontrou seu limite nessa rodada. A reprovação do perfil de leitura em carga menor permanece registrada e precisa ser investigada, sem escolher apenas os melhores resultados.

## Ambiente e critérios

- Máquina: 13th Gen Intel(R) Core(TM) i9-13900H, 20 CPUs lógicas, 15.7 GB de RAM, Windows, Node.js v24.21.0.
- Uma API Node.js, PostgreSQL local e k6 na mesma máquina; três conexões no pool Prisma. O teste não mede recursos do banco e do gerador separadamente.
- Rodada gradual: 500 mestres, 500 campanhas, 2.000 fichas, 32.000 itens, 4.000 armas e 4.000 proficiências. Cada campanha inclui 21 cópias antigas de classes (10.500 registros), representando campanhas legadas.
- Cada mestre consulta apenas suas quatro fichas. Autenticação e permissões reais permanecem ativas. Salvamentos usam a versão atual e uma ficha por VU.
- Aquecimento: 20 segundos a 25 operações/s. Etapas graduais: 30 segundos, com finalização das requisições. Etapas com sobrecarga podem terminar antes.
- Aprovação: p95 geral e de cada endpoint abaixo de 500 ms, p99 geral abaixo de 1.500 ms, erros/respostas inválidas abaixo de 1%, nenhuma iteração descartada.
- Nenhuma chamada à Vercel ou ao Neon. Schemas e tokens temporários removidos ao final.

## Rodada gradual com 2.000 fichas

| Perfil | Alvo | Duração real (s) | Req/s realizadas | p95 (ms) | p99 (ms) | Erros HTTP (%) | Iterações descartadas | Resultado |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| read | 10 op/s | 30.0 | 10.0 | 56.0 | 67.5 | 0.0 | 0 | PASS |
| read | 25 op/s | 30.0 | 25.0 | 25.6 | 28.5 | 0.0 | 0 | PASS |
| read | 50 op/s | 30.0 | 50.0 | 49.7 | 61.5 | 0.0 | 0 | PASS |
| read | 100 op/s | 30.0 | 100.0 | 52.9 | 60.0 | 0.0 | 0 | PASS |
| read | 200 op/s | 31.7 | 189.4 | 1615.8 | 2159.8 | 0.0 | 0 | LIMIT |
| mixed | 10 op/s | 30.0 | 11.0 | 59.3 | 64.7 | 0.0 | 0 | PASS |
| mixed | 25 op/s | 30.0 | 27.5 | 62.6 | 76.9 | 0.0 | 0 | PASS |
| mixed | 50 op/s | 30.1 | 54.9 | 56.7 | 66.3 | 0.0 | 0 | PASS |
| mixed | 100 op/s | 30.0 | 110.0 | 52.1 | 65.6 | 0.0 | 0 | PASS |
| mixed | 200 op/s | 30.0 | 219.9 | 15.1 | 16.2 | 0.0 | 0 | PASS |
| mixed | 400 op/s | 30.0 | 439.8 | 20.6 | 25.8 | 0.0 | 0 | PASS |
| sessions | 10 VUs | 32.7 | 23.2 | 40.1 | 53.0 | 0.0 | 0 | PASS |
| sessions | 25 VUs | 33.3 | 57.7 | 78.1 | 131.9 | 0.0 | 0 | PASS |
| sessions | 50 VUs | 33.8 | 110.8 | 177.5 | 260.0 | 0.0 | 0 | PASS |

`read` realiza consultas. `mixed` inclui 10% de operações com leitura + salvamento, gerando aproximadamente 1,1 requisição por operação. `sessions` repete o carregamento de sete conjuntos de dados, salva a cada cinco ciclos e espera 2–4 segundos. Representa uso intenso, não pessoas apenas conectadas.

## Comparação entre rodadas

| Rodada | Fichas | Etapas-alvo | Perfil | Último alvo aprovado | Primeiro alvo reprovado |
|---|---:|---|---|---|---|
| 1 | 800 | 30s | read | 400 op/s | 800 op/s |
| 1 | 800 | 30s | mixed | 200 op/s | 400 op/s |
| 1 | 800 | 30s | sessions | 25 VUs | 50 VUs |
| 2 | 800 | 60s | read | nenhum | 300 op/s |
| 2 | 800 | 60s | mixed | 300 op/s | 600 op/s |
| 2 | 800 | 60s | sessions | 50 VUs | não encontrado nos alvos testados |
| 3 | 2000 | 60s | read | nenhum | 400 op/s |
| 3 | 2000 | 60s | mixed | nenhum | 400 op/s |
| 3 | 2000 | 60s | sessions | nenhum | 50 VUs |
| 4 | 2000 | 30s | read | 100 op/s | 200 op/s |
| 4 | 2000 | 30s | mixed | 400 op/s | não encontrado nos alvos testados |
| 4 | 2000 | 30s | sessions | 50 VUs | não encontrado nos alvos testados |

Na primeira rodada, com 800 fichas, leitura a 800 op/s reprovou por iterações descartadas, mesmo com p95 geral inferior a 500 ms: o alvo completo não foi atendido. Aumentar trabalhadores de leitura manteve o dataset da segunda rodada, mas não eliminou a variação inicial. Na terceira rodada, com 2.000 fichas e início direto em 400 op/s, os três perfis reprovaram por latência; a proteção de sobrecarga interrompeu etapas em aproximadamente 10–12 segundos. A quarta rodada usou o mesmo volume maior, mas subiu gradualmente.

Essas execuções não são repetições idênticas: diferem em volume de dados, alocação, sequência, aquecimento e duração. Não permitem atribuir toda a diferença a uma causa única. Cache, planejamento de consultas, aquecimento do runtime e disputa de recursos na máquina são hipóteses para investigação, não conclusões demonstradas.

## Achados e próximas otimizações

1. **Índices nas relações.** Uma consulta somente de leitura a `pg_indexes` no schema da quarta rodada encontrou apenas índices de chave primária em `Character`, `CustomClass`, `Item`, `Weapon` e `Proficiency`, e chave primária/joinCode em `Campaign`. `EXPLAIN` de consultas por `characterId` em itens, armas e proficiências, e por `campaignId` em classes, mostrou `Seq Scan`. Priorizar índices nessas relações e verificar também `Character.userId/campaignId`, `Campaign.masterId` e as demais relações da ficha. Conferir os planos e repetir o mesmo cenário após cada mudança.
2. **Carga da lista de personagens.** `GET /api/characters` inclui cerca de quinze relações, mesmo para mostrar uma lista. Medir uma projeção com somente os campos necessários e considerar paginação para grupos maiores; comparar consultas e payload antes/depois.
3. **Normalização do catálogo.** `GET /api/classes/catalog` repete a classificação de cada classe legada para cada classe base. Classificar uma vez por registro e reutilizar o resultado é um candidato a reduzir trabalho de CPU sem mudar o catálogo.
4. **Repetibilidade e hospedagem.** Repetir uma carga fixa com o mesmo dataset, separar o gerador da API/banco e incluir teste prolongado. Depois, testar staging Vercel com branch Neon isolado e observar pool, latência de rede, cold starts, escala e consumo.

Os planos consultados são estimativas sem `EXPLAIN ANALYZE`; confirmam as varreduras planejadas, mas não provam sozinhos o gargalo dominante. Não foram criados índices nem feitas alterações no código ou no banco de produção durante esta medição.

## Reprodução e arquivos

Prepare k6, a API compilada e PostgreSQL local conforme [Testes com k6](TESTES_K6.md). Para a rodada gradual:

```powershell
$env:LOAD_MAX_VUS = '500'
$env:LOAD_READ_MAX_VUS = '500'
$env:LOAD_WARMUP_SECONDS = '20'
$env:LOAD_RATES = '10,25,50,100,200,400'
$env:LOAD_SESSION_VUS = '10,25,50'
$env:LOAD_SECONDS = '30'
npm.cmd run test:load
```

Os resultados completos permanecem localmente, fora do Git, em:

- `.audit-tools/load/2026-10-02T20-31-27-165Z-505c45ad6b6b/`: métricas JSON, relatório Markdown e logs por etapa.
- `.audit-tools/load/2026-10-02T20-42-08-840Z-ebe0b6a5b7cb/`: métricas JSON, relatório Markdown e logs por etapa.
- `.audit-tools/load/2026-10-02T20-50-25-152Z-691b28fcf65b/`: métricas JSON, relatório Markdown e logs por etapa.
- `.audit-tools/load/2026-10-02T20-55-31-842Z-0c909a6ffcf0/`: métricas JSON, relatório Markdown e logs por etapa.

Na quarta pasta, `query-plans.json` registra os índices e os planos consultados. Os arquivos `fixture.json` com tokens foram removidos. Este documento preserva as métricas agregadas no repositório; não contém credenciais ou dados de jogadores.

Esta avaliação não cobre login/cadastro repetido com bcrypt, envio de e-mail, importações, todos os módulos de campanha, renderização do navegador, resistência prolongada ou capacidade da infraestrutura de produção.
