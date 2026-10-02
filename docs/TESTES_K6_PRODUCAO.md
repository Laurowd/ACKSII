# Teste k6 em produção

Os [resultados de 02/10/2026](RESULTADOS_K6_PRODUCAO.md) registram as duas rodadas, os degraus reprovados e a confirmação de limpeza.

Este roteiro acessa **https://acksii.vercel.app** e o banco Neon real. Use apenas com autorização explícita para testar produção e numa janela adequada: pode gerar latência e consumir franquia. A CI valida os controles do roteiro, mas não executa carga em produção.

O comando local `npm run test:load` continua recusando bancos remotos. Produção tem um comando separado, `npm run test:load:production`, com destino fixo e confirmação por configuração.

## Execução autorizada

Instale k6, as dependências de backend e compile o backend. A conexão Neon existente em `backend/.env` deve ser a mesma utilizada pela aplicação publicada. Somente `DATABASE_URL` é utilizada, em memória, para preparar e limpar registros sintéticos; não há exportação das variáveis da Vercel, acesso a SMTP, migração ou alteração de schema/índices.

```powershell
$env:K6_BIN = (Resolve-Path '.audit-tools/k6/k6-v2.3.0-windows-amd64/k6.exe').Path
$env:ACKS_PRODUCTION_LOAD_ACK = 'https://acksii.vercel.app'
npm.cmd run test:load:production
```

Se o k6 estiver no PATH, omita `K6_BIN`. Nunca envie credenciais pelo chat. O reconhecimento em variável não substitui a autorização do responsável para realizar a carga.

## Limites e método

- Aquecimento separado: 10 segundos a 1 operação/s.
- Consultas e uso misto: 1, 5, 10, 20 e 40 operações/s, por 30 segundos cada.
- Sessões intensas: 1, 5, 10, 20 e 40 usuários virtuais, com pausa de 2–4 segundos entre carregamentos.
- Limites configuráveis: 40 op/s ou 40 VUs; duração entre 10 e 60 segundos; orçamento estimado de até 20.000 requisições de carga por campanha, validado antes de qualquer conexão. A preparação e as verificações de saúde são adicionais.
- Critério: p95 geral e por endpoint abaixo de 1.000 ms, p99 geral abaixo de 2.000 ms, erros/respostas inválidas abaixo de 1% e nenhuma iteração descartada.
- Os percentis usam `http_req_duration`: envio, espera e recebimento, incluindo rede, hospedagem e banco. Estabelecimento de conexão/TLS ficam em métricas separadas no JSON e não entram nesses percentis. O critério local anterior era p95 abaixo de 500 ms, portanto uma aprovação de produção não implica aprovação nesse critério mais estrito.
- Uma fase que reprova interrompe aquele perfil. Erros de pelo menos 1% ou p95 de pelo menos 2 segundos interrompem toda a campanha. O k6 também avalia os [thresholds de interrupção](https://grafana.com/docs/k6/latest/using-k6/thresholds/) durante a fase, após dez segundos.
- O gerador é limitado a 80 trabalhadores de leitura e 40 para salvamentos. Descartes indicam alvo não atendido, mas podem refletir alocação insuficiente no gerador.

Configure `LOAD_RATES`, `LOAD_SESSION_VUS`, `LOAD_SECONDS` e `LOAD_PROFILES` para uma execução menor. Aumentar duração ou repetir alvos pode exceder o orçamento e será recusado. O roteiro não autoriza destinos alternativos ou carga ilimitada.

## Dados temporários e limpeza

São criadas dez contas de mestre, dez campanhas e quarenta fichas, quatro por conta/campanha, com dezesseis itens, duas armas e duas proficiências por ficha. Cada campanha recebe 21 cópias antigas de classes para representar compatibilidade com campanhas existentes. Dez fichas de mago têm duas magias.

As contas têm identificador único `k6_prod_<hex>`, senha aleatória e sessão obtida por login na API publicada. Cada trabalhador que salva recebe uma ficha própria. Os usuários virtuais compartilham dez contas: não são quarenta contas independentes. Login acontece uma vez por conta, antes da carga, preservando os limites por IP; cadastro, bcrypt repetido e e-mail não entram no perfil de carga.

O roteiro guarda os UUIDs gerados, verifica o proprietário e remove apenas os registros daquele teste em uma transação. Também remove os logs de auditoria dessas contas e o arquivo temporário com tokens. Não executa exclusão ampla, `DROP SCHEMA`, migrações ou alterações de fichas existentes. As verificações de saúde, banco e acesso anônimo são repetidas após a limpeza.

Uma interrupção normal ou Ctrl+C tenta executar a limpeza. Encerrar à força a máquina/processo ou perder acesso ao banco pode impedir isso: `cleanup-identifiers.json` permanece em `.audit-tools/production-load/<execução>/` para permitir conferir os IDs exatos, sem conter senha ou tokens.

## Resultados

Métricas JSON, Markdown e logs ficam em `.audit-tools/production-load/<execução>/`, ignorados pelo Git. Há duração real, p95/p99 geral e por endpoint, requisições/s, erros, respostas inválidas, descartes e confirmação de limpeza. CPU/RAM da API e consumo/faturamento da Vercel/Neon não são medidos remotamente pelo roteiro.

O comando termina com sucesso quando conclui a investigação e os relatórios, mesmo que encontre uma fase LIMIT. Confira o relatório para interpretar a capacidade. Uma fase PASS comprova apenas o degrau observado naquele momento, dataset e percurso de rede. Se o maior alvo configurado passar, há um limite inferior, não um teto comprovado. Um teste curto não substitui repetibilidade, teste prolongado ou acompanhamento dos recursos da hospedagem.

Os limites da plataforma devem ser conferidos na conta e na [documentação da Vercel](https://vercel.com/docs/functions/limitations); o roteiro não estima custo ou muda o plano contratado.
