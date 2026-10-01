// LT0-ML · H4: ¿cargar el modelo en diferido mueve el TTI?
//
// Misma build, tres variantes, intercaladas para que la deriva de la máquina afecte a todas:
//   A  ?modelo=0   la página sin modelo (línea base)
//   B  (normal)    la página que, tras el evento load y en tiempo libre, levanta el Worker
//                  y descarga + descuantiza los pesos de v000 (sintéticos: casi todo ceros,
//                  gzip los deja en ~20 KB)
//   C  (denso)     igual que B, pero con la sección W de los pesos llena de bytes aleatorios:
//                  ~229 KB que gzip no comprime. Es el peor caso con datos reales.
// Lighthouse 13 con freno aplicado de verdad (throttlingMethod "devtools") según el perfil
// web de referencia (decisions/001).
//
// Criterio (fijado antes de medir): Aprobado si el límite superior del IC 95% bootstrap de
// (mediana TTI X − mediana TTI A) es ≤ 50 ms, para X = B y X = C.
//
// Uso: npm run bench:tti

import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { PERFIL, lanzarNavegador, mediana, percentil, servir } from './cdp.mjs';

const DIST = fileURLToPath(new URL('../dist/app/', import.meta.url));
const DIST_DENSO = fileURLToPath(new URL('../dist/app-denso/', import.meta.url));
const SALIDA = fileURLToPath(new URL('./resultados/', import.meta.url));
const CORRIDAS = Number(process.env.CORRIDAS ?? 15);
const UMBRAL_MS = 50;

const configuracion = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    formFactor: 'mobile',
    screenEmulation: {
      mobile: PERFIL.pantalla.movil,
      width: PERFIL.pantalla.ancho,
      height: PERFIL.pantalla.alto,
      deviceScaleFactor: PERFIL.pantalla.factor,
      disabled: false,
    },
    throttlingMethod: 'devtools',
    // Valores "devtools" del perfil Slow 4G de Lighthouse (latencia × 3,75; caudal × 0,9).
    throttling: {
      cpuSlowdownMultiplier: PERFIL.cpu,
      requestLatencyMs: PERFIL.red.latencia * 3.75,
      downloadThroughputKbps: PERFIL.red.bajadaKbps * 0.9,
      uploadThroughputKbps: PERFIL.red.subidaKbps * 0.9,
      rttMs: PERFIL.red.latencia,
      throughputKbps: PERFIL.red.bajadaKbps,
    },
    disableStorageReset: false,
  },
};

function metricas(lhr) {
  const a = lhr.audits;
  const peticiones = a['network-requests']?.details?.items ?? [];
  const pesos = peticiones.find((p) => p.url.endsWith('/modelo/weights.bin'));
  const transferencia = peticiones.reduce((s, p) => s + (p.transferSize ?? 0), 0);
  const jsInicial = peticiones
    .filter((p) => p.resourceType === 'Script' && !p.url.includes('worker'))
    .reduce((s, p) => s + (p.transferSize ?? 0), 0);
  return {
    fcp: a['first-contentful-paint'].numericValue,
    lcp: a['largest-contentful-paint'].numericValue,
    si: a['speed-index'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    tti: a['interactive'].numericValue,
    transferenciaTotal: transferencia,
    jsInicialTransferido: jsInicial,
    pesosDescargados: pesos ? { transferSize: pesos.transferSize, fin: pesos.networkEndTime } : null,
    error: lhr.runtimeError?.message ?? null,
  };
}

function bootstrapDiferenciaMedianas(a, b, n = 5000, semilla = 7) {
  let s = semilla;
  const azar = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const muestra = (v) => Array.from({ length: v.length }, () => v[Math.floor(azar() * v.length)]);
  const difs = Array.from({ length: n }, () => mediana(muestra(b)) - mediana(muestra(a)));
  return { bajo: percentil(difs, 0.025), alto: percentil(difs, 0.975) };
}

// Variante C: copia de la build con la sección W reemplazada por bytes aleatorios.
cpSync(DIST, DIST_DENSO, { recursive: true });
{
  const manifiesto = JSON.parse(readFileSync(`${DIST}modelo/manifest.json`, 'utf8'));
  const pesos = readFileSync(`${DIST}modelo/weights.bin`);
  const { offset, largo } = manifiesto.secciones.W;
  randomBytes(largo).copy(pesos, offset);
  writeFileSync(`${DIST_DENSO}modelo/weights.bin`, pesos);
}

const servidor = await servir(DIST, { comprimir: true });
const servidorDenso = await servir(DIST_DENSO, { comprimir: true });
const navegador = await lanzarNavegador();
const puerto = Number(new URL(navegador.wsUrl).port);
const corridas = { A: [], B: [], C: [] };
const ORDENES = [['A', 'B', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B']];
try {
  for (let i = 0; i < CORRIDAS; i++) {
    for (const variante of ORDENES[i % 3]) {
      const url = { A: `${servidor.url}?modelo=0`, B: servidor.url, C: servidorDenso.url }[variante];
      const r = await lighthouse(url, { port: puerto, output: 'json', logLevel: 'error' }, configuracion);
      const m = metricas(r.lhr);
      corridas[variante].push(m);
      console.log(
        `#${String(i).padStart(2)} ${variante}  TTI ${m.tti.toFixed(0)} ms  FCP ${m.fcp.toFixed(0)}  ` +
          `LCP ${m.lcp.toFixed(0)}  TBT ${m.tbt.toFixed(0)}  pesos ${m.pesosDescargados ? 'sí' : 'no'}` +
          (m.error ? `  ERROR ${m.error}` : ''),
      );
    }
  }
} finally {
  await navegador.cerrar();
  servidor.cerrar();
  servidorDenso.cerrar();
}

const resumen = {};
for (const x of ['B', 'C']) {
  resumen[x] = {};
  for (const clave of ['tti', 'fcp', 'lcp', 'si', 'tbt', 'transferenciaTotal', 'jsInicialTransferido']) {
    const a = corridas.A.map((m) => m[clave]);
    const b = corridas[x].map((m) => m[clave]);
    resumen[x][clave] = {
      medianaA: mediana(a),
      medianaX: mediana(b),
      diferencia: mediana(b) - mediana(a),
      ic95: bootstrapDiferenciaMedianas(a, b),
    };
  }
}
const descargoEnTodas =
  corridas.B.every((m) => m.pesosDescargados) &&
  corridas.C.every((m) => m.pesosDescargados) &&
  corridas.A.every((m) => !m.pesosDescargados);
const aprobado = descargoEnTodas && ['B', 'C'].every((x) => resumen[x].tti.ic95.alto <= UMBRAL_MS);

mkdirSync(SALIDA, { recursive: true });
writeFileSync(
  `${SALIDA}h4.json`,
  JSON.stringify(
    {
      hipotesis: 'H4: cargar el modelo en diferido no mueve el TTI',
      criterio: `límite superior del IC 95% de (mediana TTI X − mediana TTI A) ≤ ${UMBRAL_MS} ms, X ∈ {B, C}`,
      perfil: PERFIL,
      lighthouse: '13.5.0 (throttlingMethod devtools)',
      corridasPorVariante: CORRIDAS,
      descargoPesosSoloEnByC: descargoEnTodas,
      resumen,
      estado: aprobado ? 'Aprobado' : 'No aprobado',
      corridas,
    },
    null,
    1,
  ) + '\n',
);

for (const x of ['B', 'C']) {
  console.log(`\n${x} vs A          mediana A   mediana ${x}   ${x}−A      IC95%`);
  for (const [k, v] of Object.entries(resumen[x])) {
    console.log(
      `${k.padEnd(20)} ${v.medianaA.toFixed(0).padStart(8)} ${v.medianaX.toFixed(0).padStart(10)} ` +
        `${v.diferencia.toFixed(0).padStart(7)}   [${v.ic95.bajo.toFixed(0)}, ${v.ic95.alto.toFixed(0)}]`,
    );
  }
}
console.log(`\nPesos descargados en todas las B y C, y en ninguna A: ${descargoEnTodas}`);
console.log(`H4: ${aprobado ? 'Aprobado' : 'No aprobado'} (criterio: IC95% superior ≤ ${UMBRAL_MS} ms)`);
