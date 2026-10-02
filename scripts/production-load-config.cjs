const ORIGIN = 'https://acksii.vercel.app';
function configuration(env = process.env) {
  if (env.ACKS_PRODUCTION_LOAD_ACK !== ORIGIN) throw new Error('Production load requires the explicit ACKSII production acknowledgement.');
  const seconds = Number(env.LOAD_SECONDS || 30);
  const rates = (env.LOAD_RATES || '1,5,10,20,40').split(',').map(Number);
  const sessions = (env.LOAD_SESSION_VUS || '1,5,10,20,40').split(',').map(Number);
  const profiles = (env.LOAD_PROFILES || 'read,mixed,sessions').split(',');
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 60 ||
      rates.some(n => !Number.isInteger(n) || n < 1 || n > 40) ||
      sessions.some(n => !Number.isInteger(n) || n < 1 || n > 40) ||
      profiles.some(p => !['read', 'mixed', 'sessions'].includes(p))) throw new Error('Invalid bounded production load configuration.');
  const theoreticalRequests = seconds * rates.reduce((a, b) => a + b, 0) * profiles.filter(p => p !== 'sessions').length * 1.1 + seconds * sessions.reduce((a, b) => a + b, 0) * (profiles.includes('sessions') ? 4.5 : 0);
  if (theoreticalRequests > 20000) throw new Error('Configured run exceeds the production request budget.');
  return { origin: ORIGIN, seconds, rates, sessions, profiles, k6: env.K6_BIN || 'k6' };
}
module.exports = { ORIGIN, configuration };
