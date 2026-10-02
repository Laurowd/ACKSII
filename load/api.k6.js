import http from 'k6/http';
import { check, sleep } from 'k6';
import execution from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// Public traffic requires a separate, bounded production runner and acknowledgement.
const base = __ENV.LOAD_BASE_URL || '';
const production = __ENV.LOAD_TARGET === 'production';
if (production ? base !== 'https://acksii.vercel.app' || __ENV.ACKS_PRODUCTION_LOAD_ACK !== base : !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Use loopback, or explicitly acknowledged ACKSII production.');
const actors = new SharedArray('isolated actors', () => JSON.parse(open(__ENV.LOAD_FIXTURE)).actors);
const profile = __ENV.LOAD_PROFILE || 'read';
const amount = Number(__ENV.LOAD_AMOUNT || 10);
const maxVUs = Number(__ENV.LOAD_MAX_VUS || 200);
const duration = __ENV.LOAD_DURATION || '30s';
if (production && (!/^\d+s$/.test(duration) || Number(duration.slice(0, -1)) < 10 || Number(duration.slice(0, -1)) > 60)) throw new Error('Production phases must last 10–60 seconds.');
if (!['read', 'mixed', 'sessions'].includes(profile) || !Number.isInteger(amount) || amount < 1 || !actors.length || (profile !== 'read' && maxVUs > actors.length) || (production && (amount > 40 || maxVUs > 80))) throw new Error('Invalid profile, load or actor allocation.');
const endpoints = ['sheet', 'characters', 'catalog', 'rules', 'session', 'settings', 'metadata'];
if (profile !== 'read') endpoints.push('save');
const invalid = new Rate('invalid_responses');
const serverErrors = new Rate('server_errors');
const rateLimited = new Rate('rate_limited');
const conflicts = new Rate('write_conflicts');
const latency = new Trend('endpoint_latency', true);
const overloadLatency = new Trend('overload_latency', true);
const operations = new Counter('operations');
let errorShown = false;
const thresholds = {
  http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '10s' }],
  invalid_responses: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '10s' }],
  http_req_duration: production ? ['p(95)<1000', 'p(99)<2000'] : ['p(95)<500', 'p(99)<1500'],
  overload_latency: [{ threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '10s' }],
  dropped_iterations: ['count==0'],
};
for (const endpoint of endpoints) thresholds[`endpoint_latency{endpoint:${endpoint}}`] = [production ? 'p(95)<1000' : 'p(95)<500'];
export const options = {
  maxRedirects: 0,
  userAgent: 'ACKSII-authorized-k6-capacity-test',
  scenarios: { workload: profile === 'sessions'
    ? { executor: 'constant-vus', vus: amount, duration, gracefulStop: '10s' }
    : { executor: 'constant-arrival-rate', rate: amount, timeUnit: '1s', duration, preAllocatedVUs: maxVUs, maxVUs, gracefulStop: '10s' } },
  thresholds, summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
  systemTags: ['status', 'method', 'name', 'scenario', 'expected_response', 'check', 'error_code'],
};
function validBody(response, endpoint) {
  if (response.status !== 200) return false;
  try {
    const data = response.json();
    if (endpoint === 'sheet' || endpoint === 'save') return typeof data.character?.id === 'string' && Number.isInteger(data.character.version);
    if (endpoint === 'characters' || endpoint === 'session') return Array.isArray(data.characters);
    if (endpoint === 'catalog') return Array.isArray(data) && data.length >= 21;
    if (endpoint === 'rules') return data.supported === true && Boolean(data.rules);
    if (endpoint === 'settings') return typeof data.optionalRules === 'object';
    return Boolean(data.classes && Array.isArray(data.spells));
  } catch { return false; }
}
function record(response, endpoint) {
  const okay = validBody(response, endpoint);
  if (!okay && __ENV.LOAD_DEBUG === 'true' && !errorShown) { errorShown = true; console.warn(`${endpoint}: HTTP ${response.status}; ${String(response.body).slice(0, 300)}`); }
  check(response, { 'status and response schema': () => okay }, { endpoint });
  invalid.add(!okay); serverErrors.add(response.status >= 500 || response.status === 0);
  rateLimited.add(response.status === 429); conflicts.add(response.status === 409);
  latency.add(response.timings.duration, { endpoint }); overloadLatency.add(response.timings.duration);
  return okay;
}
function paths(actor) {
  return { sheet: `/api/characters/${actor.characterId}`, characters: '/api/characters',
    catalog: `/api/classes/catalog?campaignId=${actor.campaignId}`, rules: `/api/game-rules/characters/${actor.characterId}`,
    session: '/api/session', settings: `/api/campaigns/${actor.campaignId}/settings`, metadata: '/api/game-rules/metadata' };
}
function get(actor, endpoint) {
  const response = http.get(base + paths(actor)[endpoint], { headers: { Authorization: `Bearer ${actor.token}` }, tags: { name: endpoint }, timeout: '10s' });
  record(response, endpoint); return response;
}
function save(actor) {
  const before = get(actor, 'sheet');
  if (!validBody(before, 'sheet')) return;
  const response = http.put(base + paths(actor).sheet,
    JSON.stringify({ version: before.json().character.version, notes: `${production ? 'Production synthetic' : 'Isolated'} load VU ${execution.vu.idInTest}; iteration ${execution.scenario.iterationInTest}` }),
    { headers: { Authorization: `Bearer ${actor.token}`, 'Content-Type': 'application/json' }, tags: { name: 'save' }, timeout: '10s' });
  record(response, 'save');
}
export default function () {
  const index = execution.vu.idInTest - 1;
  const actor = actors[profile === 'read' ? index % actors.length : index];
  if (!actor) throw new Error('Every virtual user requires its own isolated sheet.');
  if (profile === 'sessions') {
    const names = ['sheet', 'catalog', 'settings', 'rules'];
    const responses = http.batch(names.map(endpoint => ['GET', base + paths(actor)[endpoint], null,
      { headers: { Authorization: `Bearer ${actor.token}` }, tags: { name: endpoint }, timeout: '10s' }]));
    responses.forEach((response, index) => record(response, names[index]));
    // Masters also consult the group and their character list. Metadata represents initial rule loading.
    get(actor, 'session'); get(actor, 'characters'); get(actor, 'metadata');
    if (execution.vu.iterationInScenario % 5 === 0) save(actor);
    operations.add(1); sleep(2 + Math.random() * 2); return;
  }
  const sequence = ['sheet', 'characters', 'catalog', 'sheet', 'rules', 'session', 'settings', 'metadata', 'sheet', profile === 'mixed' ? 'save' : 'sheet'];
  const endpoint = sequence[execution.scenario.iterationInTest % sequence.length];
  if (endpoint === 'save') save(actor); else get(actor, endpoint);
  operations.add(1);
}
export function handleSummary(data) {
  return { [__ENV.LOAD_SUMMARY]: JSON.stringify(data, null, 2), stdout: `Completed ${profile} at ${amount} ${profile === 'sessions' ? 'VUs' : 'operations/s'}.\n` };
}
