const fs = require('node:fs');
const path = require('node:path');
const n = value => Number.isFinite(value) ? value.toFixed(1) : '—';
function writeProductionReport(run, directory) {
  const lines = ['# k6 — ACKSII em produção', '', `Data UTC: ${run.date}. Alvo autorizado: ${run.origin}. ${run.k6}.`, '',
    `Dados temporários adicionados ao banco existente: ${JSON.stringify(run.dataset)}. Dez contas de mestre autenticadas pela API; 40 fichas distintas, uma por trabalhador que salva.`, '',
    `Etapas-alvo de ${run.config.seconds}s; aquecimento separado de 10s a 1 op/s. Requisições feitas desta máquina por HTTPS, incluindo o percurso de rede até a API. Os percentis usam http_req_duration, que exclui estabelecimento de conexão/TLS; esses tempos ficam em métricas separadas no JSON. Não há medição remota de CPU/RAM nem atribuição por instância Vercel.`, '',
    'Critério de produção: p95 geral e por endpoint < 1.000 ms; p99 geral < 2.000 ms; erros/respostas inválidas < 1%; nenhuma iteração descartada. O critério local anterior era p95 < 500 ms: os resultados não são equivalentes. Para segurança, erros >= 1% ou p95 >= 2s interrompem toda a campanha. Alvos limitados a 40 op/s ou 40 VUs e orçamento estimado de 20.000 requisições de carga.', '',
    '| Perfil | Alvo | Duração real s | Req/s | p95 ms | p99 ms | Erros HTTP % | Respostas inválidas % | Descartadas | Resultado |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  for (const p of run.phases) {
    const m = p.summary.metrics;
    lines.push(`| ${p.profile} | ${p.amount}${p.profile === 'sessions' ? ' VUs' : ' op/s'} | ${n(p.summary.state.testRunDurationMs / 1000)} | ${n(m.http_reqs.values.rate)} | ${n(m.http_req_duration.values['p(95)'])} | ${n(m.http_req_duration.values['p(99)'])} | ${n(100 * m.http_req_failed.values.rate)} | ${n(100 * m.invalid_responses.values.rate)} | ${m.dropped_iterations?.values.count || 0} | ${p.exitCode ? 'LIMIT' : 'PASS'} |`);
  }
  lines.push('', '## Endpoints e critérios reprovados', '', '| Perfil/alvo | Endpoint | p95 ms | p99 ms |', '|---|---|---:|---:|');
  for (const p of run.phases) for (const [key, metric] of Object.entries(p.summary.metrics)) {
    const endpoint = key.match(/^endpoint_latency\{endpoint:([^}]+)\}$/)?.[1];
    if (endpoint) lines.push(`| ${p.profile}/${p.amount} | ${endpoint} | ${n(metric.values['p(95)'])} | ${n(metric.values['p(99)'])} |`);
  }
  for (const p of run.phases.filter(p => p.exitCode)) {
    const failed = Object.entries(p.summary.metrics).flatMap(([metric, data]) => Object.entries(data.thresholds || {}).filter(([, result]) => !result.ok).map(([threshold]) => `${metric}: ${threshold}`));
    lines.push('', `Reprovação ${p.profile}/${p.amount}: ${failed.join('; ') || 'verificar log'}.`);
  }
  const measured = [...(run.warmup ? [run.warmup] : []), ...run.phases];
  const requests = measured.reduce((total, p) => total + p.summary.metrics.http_reqs.values.count, 0);
  const received = measured.reduce((total, p) => total + (p.summary.metrics.data_received?.values.count || 0), 0);
  lines.push('', `Carga medida pelo k6, incluindo aquecimento: ${requests} requisições HTTP; ${n(received / 1048576)} MiB recebidos. Preparação/login e verificações de saúde são adicionais; isso não é uma estimativa de faturamento.`, '', '## Limpeza e alcance', '', `Limpeza: ${JSON.stringify(run.cleanup)}. Verificação de saúde após a limpeza: ${run.healthyAfter ? 'OK' : 'pendente'}.`, '',
    ...(run.stopReason ? [run.stopReason, ''] : []),
    'Consultas e salvamentos de notas afetam apenas fichas sintéticas. Login foi realizado uma vez por conta antes da carga; não houve loop de cadastro/login, alteração de limites por IP, deploy, migração ou mudanças de schema/índices. A preparação usou somente a credencial Neon já configurada, em memória; nenhum conjunto de segredos Vercel foi exportado.', '',
    '`read`: consultas autenticadas; `mixed`: 10% das operações fazem leitura + salvamento; `sessions`: carregamento intenso com requisições paralelas, salvamento a cada cinco ciclos e pausa de 2–4s. Os VUs compartilham dez contas, mas usam fichas distintas para salvar. VUs não equivalem a visitantes por dia.', '',
    'Uma fase PASS é um degrau observado neste momento, dataset e percurso de rede. Se nenhum alvo falhar, o resultado é apenas um limite inferior. Nenhum teste prolongado, capacidade de login/bcrypt, todos os módulos ou custo/faturamento completo foi medido.', '',
    'Referência para interrupção por critérios: [thresholds do Grafana k6](https://grafana.com/docs/k6/latest/using-k6/thresholds/).');
  fs.writeFileSync(path.join(directory, 'report.md'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(run, null, 2));
}
module.exports = { writeProductionReport };
