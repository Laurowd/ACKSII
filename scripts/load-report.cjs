const fs = require('node:fs');
const path = require('node:path');
const number = value => Number.isFinite(value) ? value.toFixed(1) : '—';
function writeReport(run, directory) {
  const lines = ['# k6 — capacidade em ambiente local isolado', '', `Data: ${run.date}. Aplicação: ${run.commit}. ${run.k6}.`, '',
    `Máquina: ${run.machine.cpu}; ${run.machine.logicalCores} CPUs lógicas; ${number(run.machine.ramGb)} GB de RAM; ${run.machine.platform}; ${run.machine.node}.`, '',
    `Uma API Node.js com ${run.config.connectionLimit} conexões Prisma, PostgreSQL local e gerador de carga na mesma máquina. Cada fase tem duração-alvo de ${run.config.seconds}s; sobrecarga pode interrompê-la antes. A duração real inclui a finalização das requisições.`, '',
    `Dataset: ${JSON.stringify(run.dataset || {})}. Os schemas e tokens de teste são exclusivos e removidos ao final.`, '',
    `Aquecimento: ${run.config.warmupSeconds || 0}s a 25 operações/s, separado das fases abaixo. VUs alocados: ${run.config.maxVUs}; leitura: ${run.config.readMaxVUs || run.config.maxVUs}.`, '',
    'Critérios: p95 < 500 ms e p99 < 1.500 ms; erros HTTP/respostas inválidas < 1%; nenhuma iteração descartada. Cada endpoint também deve ter p95 < 500 ms. Interrompe o perfil no primeiro critério reprovado.', '',
    '| Perfil | Alvo | Duração real s | Req/s reais | p95 ms | p99 ms | Erros % | Iterações descartadas | CPU API (% de um núcleo) | RAM API MB | Event loop p99 máximo ms | Resultado |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  for (const phase of run.phases) {
    const m = phase.summary.metrics;
    const samples = phase.resources;
    const cpu = samples.length ? samples.reduce((sum, s) => sum + s.cpuCorePercent, 0) / samples.length : undefined;
    const ram = samples.length ? Math.max(...samples.map(s => s.rssMb)) : undefined;
    const loop = samples.length ? Math.max(...samples.map(s => s.eventLoopP99Ms)) : undefined;
    lines.push(`| ${phase.profile} | ${phase.amount}${phase.profile === 'sessions' ? ' VUs' : ' op/s'} | ${number(phase.summary.state?.testRunDurationMs / 1000)} | ${number(m.http_reqs?.values.rate)} | ${number(m.http_req_duration?.values['p(95)'])} | ${number(m.http_req_duration?.values['p(99)'])} | ${number(100 * (m.http_req_failed?.values.rate || 0))} | ${m.dropped_iterations?.values.count || 0} | ${number(cpu)} | ${number(ram)} | ${number(loop)} | ${phase.exitCode === 0 ? 'PASS' : 'LIMIT'} |`);
  }
  lines.push('', '## Endpoints por fase', '', '| Perfil / alvo | Endpoint | p95 ms | p99 ms |', '|---|---|---:|---:|');
  for (const phase of run.phases) for (const [key, metric] of Object.entries(phase.summary.metrics)) {
    const endpoint = key.match(/^endpoint_latency\{endpoint:([^}]+)\}$/)?.[1];
    if (endpoint) lines.push(`| ${phase.profile} / ${phase.amount} | ${endpoint} | ${number(metric.values['p(95)'])} | ${number(metric.values['p(99)'])} |`);
  }
  lines.push('', '## Critérios reprovados', '');
  for (const phase of run.phases.filter(p => p.exitCode !== 0)) {
    const failed = Object.entries(phase.summary.metrics).flatMap(([metric, data]) => Object.entries(data.thresholds || {}).filter(([, result]) => !result.ok).map(([threshold]) => `${metric}: ${threshold}`));
    lines.push(`- ${phase.profile}/${phase.amount}: ${failed.join('; ') || 'sem threshold reprovado; verificar o log e o código de saída ' + phase.exitCode}.`);
  }
  lines.push('', '## Alcance', '', 'São testes curtos de API autenticada, não um teste de resistência prolongado nem de renderização do navegador. Login/cadastro não são repetidos na carga: limites por IP são preservados e sessões de teste são preparadas antes. Não há requisições à Vercel ou ao Neon.', '',
    '`read` distribui consultas de ficha, personagens, catálogo, regras, sessão do mestre, configurações e metadados. `mixed` substitui 10% das operações por leitura + salvamento de notas com a versão atual; cada VU tem sua própria ficha. `sessions` carrega esses dados, salva a cada cinco ciclos e espera entre 2 e 4 segundos. Esse perfil representa atividade intensa, não usuários apenas conectados.', '',
    'Uma fase PASS indica que o alvo medido passou neste dataset e nesta máquina. Uma fase LIMIT identifica o primeiro degrau que reprovou, não um limite universal. Se todos os degraus passam, só existe um limite inferior observado. VUs não equivalem a visitantes por dia ou usuários cadastrados.', '',
    'A capacidade Vercel + Neon ainda exige um teste separado em staging com branch Neon isolado e as mesmas configurações, incluindo latência de rede, autoscaling, cold starts e franquias.');
  fs.writeFileSync(path.join(directory, 'report.md'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(run, null, 2));
}
module.exports = { writeReport };
