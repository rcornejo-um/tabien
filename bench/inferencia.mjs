// LT0-ML · H2: ¿la inferencia TS p95 es ≤ 10 ms por nota en el perfil de referencia?
//
// Tres modos, para no suponer nada sobre el freno de CPU:
//   libre       sin freno (línea base; NO es una medición válida para H2)
//   pagina-4x   Emulation.setCPUThrottlingRate=4 solo en la página
//   todo-4x     además se intenta aplicar el freno al target del Worker
// Si el Worker no se frena, sus tiempos en "pagina-4x" serán ~iguales a "libre".
//
// Uso: npm run bench:inferencia

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { PERFIL, evaluar, lanzarNavegador, nuevaPagina, percentil, servir } from './cdp.mjs';

const DIST = fileURLToPath(new URL('../dist/bench/', import.meta.url));
const SALIDA = fileURLToPath(new URL('./resultados/', import.meta.url));
const CORRIDAS = 3;
const LIMITE_P95_MS = 10;

async function correr(cdp, url, modo) {
  const { targetId, sessionId } = await nuevaPagina(cdp);
  const intentosWorker = [];
  if (modo !== 'libre') {
    await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: PERFIL.cpu }, sessionId);
  }
  if (modo === 'todo-4x') {
    cdp.alEvento(async (msg) => {
      if (msg.method !== 'Target.attachedToTarget' || msg.sessionId !== sessionId) return;
      const { sessionId: sw, targetInfo } = msg.params;
      try {
        await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: PERFIL.cpu }, sw);
        intentosWorker.push({ tipo: targetInfo.type, ok: true });
      } catch (e) {
        intentosWorker.push({ tipo: targetInfo.type, ok: false, error: String(e.message) });
      }
      await cdp.enviar('Runtime.runIfWaitingForDebugger', {}, sw).catch(() => {});
    });
    await cdp.enviar(
      'Target.setAutoAttach',
      { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
      sessionId,
    );
  }
  await cdp.enviar('Page.navigate', { url: `${url}inferencia.html` }, sessionId);
  let resultado;
  for (let i = 0; i < 600 && !resultado; i++) {
    await esperar(250);
    resultado = await evaluar(cdp, sessionId, 'window.__resultado').catch(() => undefined);
  }
  await cdp.enviar('Target.closeTarget', { targetId });
  if (!resultado) throw new Error(`Sin resultado en modo ${modo}`);
  if (resultado.error) throw new Error(resultado.error);
  return { ...resultado, intentosWorker };
}

function resumir(m) {
  const t = m.tiemposMs;
  return {
    p50: percentil(t, 0.5),
    p95: percentil(t, 0.95),
    p99: percentil(t, 0.99),
    max: Math.max(...t),
    mediaMs: m.totalMs / t.length,
    resolucionMs: m.resolucionMs,
    aisladoOrigen: m.aisladoOrigen,
  };
}

const servidor = await servir(DIST, { aislado: true });
const { cdp, cerrar } = await lanzarNavegador();
const version = await cdp.enviar('Browser.getVersion');
const filas = [];
try {
  for (const modo of ['libre', 'pagina-4x', 'todo-4x']) {
    for (let c = 0; c < CORRIDAS; c++) {
      const r = await correr(cdp, servidor.url, modo);
      filas.push({ modo, corrida: c, worker: resumir(r.worker), principal: resumir(r.principal), intentosWorker: r.intentosWorker, notas: r.worker.notas, repeticiones: r.worker.repeticiones });
      console.log(
        `${modo.padEnd(10)} #${c}  worker p50 ${r && resumir(r.worker).p50.toFixed(3)} p95 ${resumir(r.worker).p95.toFixed(3)} ms` +
          ` | principal p50 ${resumir(r.principal).p50.toFixed(3)} p95 ${resumir(r.principal).p95.toFixed(3)} ms` +
          (r.intentosWorker.length ? ` | freno worker: ${JSON.stringify(r.intentosWorker)}` : ''),
      );
    }
  }
} finally {
  await cerrar();
  servidor.cerrar();
}

mkdirSync(SALIDA, { recursive: true });
writeFileSync(
  `${SALIDA}h2.json`,
  JSON.stringify({ hipotesis: 'H2: p95 de inferencia TS ≤ 10 ms por nota', perfil: PERFIL, navegador: version.product, limiteP95Ms: LIMITE_P95_MS, filas }, null, 1) + '\n',
);
console.log(`\nNavegador: ${version.product}. Resultados en bench/resultados/h2.json`);
