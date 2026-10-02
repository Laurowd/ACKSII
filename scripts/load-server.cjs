const { monitorEventLoopDelay } = require('node:perf_hooks');
const { buildApp } = require('../backend/dist/app');
const port = Number(process.env.LOAD_API_PORT);
if (!process.env.LOAD_ISOLATED || !Number.isInteger(port)) throw new Error('Use scripts/run-load.cjs.');
const app = buildApp(undefined, false);
const delay = monitorEventLoopDelay({ resolution: 20 });
delay.enable();
let previous = process.cpuUsage();
let previousTime = process.hrtime.bigint();
const sample = setInterval(() => {
  const usage = process.cpuUsage(previous); previous = process.cpuUsage();
  const time = process.hrtime.bigint(), elapsedMicros = Number(time - previousTime) / 1000; previousTime = time;
  if (process.connected) process.send({ type: 'resource', time: Date.now(),
    cpuCorePercent: 100 * (usage.user + usage.system) / elapsedMicros, rssMb: process.memoryUsage().rss / 1048576,
    eventLoopP99Ms: delay.percentile(99) / 1e6 });
  delay.reset();
}, 1000);
app.listen({ host: '127.0.0.1', port }).then(() => process.send({ type: 'ready' })).catch(error => { console.error(error.message); process.exit(1); });
process.on('message', async message => {
  if (message !== 'stop') return;
  clearInterval(sample); delay.disable(); await app.close(); process.exit(0);
});
