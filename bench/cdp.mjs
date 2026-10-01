// Herramientas compartidas de los benchmarks, sin dependencias:
// servidor estático, lanzamiento de Chromium (Brave) y un cliente CDP mínimo
// (WebSocket nativo de Node ≥ 22).

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';

export const CHROME = process.env.CHROME_PATH ?? '/usr/bin/brave';

/** Perfil "web de referencia" (decisions/001). */
export const PERFIL = {
  cpu: 4,
  red: { latencia: 150, bajadaKbps: 1638.4, subidaKbps: 750 },
  pantalla: { ancho: 412, alto: 823, factor: 1.75, movil: true },
};

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Servidor estático. `aislado` agrega COOP/COEP → timers de 5 µs en vez de 100 µs.
 * `comprimir` responde con gzip nivel 6 si el cliente lo acepta (como un hosting real).
 */
export function servir(carpeta, { aislado = false, comprimir = false } = {}) {
  const servidor = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let ruta = normalize(join(carpeta, decodeURIComponent(url.pathname)));
    if (!ruta.startsWith(carpeta)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(ruta).isDirectory()) ruta = join(ruta, 'index.html');
      let cuerpo = readFileSync(ruta);
      const cabeceras = { 'content-type': TIPOS[extname(ruta)] ?? 'application/octet-stream' };
      if (comprimir && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        cuerpo = gzipSync(cuerpo, { level: 6 });
        cabeceras['content-encoding'] = 'gzip';
      }
      if (aislado) {
        cabeceras['cross-origin-opener-policy'] = 'same-origin';
        cabeceras['cross-origin-embedder-policy'] = 'require-corp';
      }
      res.writeHead(200, cabeceras).end(cuerpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolver) => {
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      resolver({ url: `http://127.0.0.1:${port}/`, cerrar: () => servidor.close() });
    });
  });
}

export async function lanzarNavegador() {
  const perfil = mkdtempSync(join(tmpdir(), 'tabien-bench-'));
  const proceso = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${perfil}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const wsUrl = await new Promise((resolver, rechazar) => {
    let buffer = '';
    proceso.stderr.on('data', (d) => {
      buffer += d.toString();
      const m = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolver(m[1]);
    });
    proceso.on('exit', (c) => rechazar(new Error(`El navegador terminó (código ${c})`)));
  });
  const cdp = await conectar(wsUrl);
  return {
    cdp,
    wsUrl,
    async cerrar() {
      cdp.cerrar();
      proceso.kill();
      await esperar(300);
      rmSync(perfil, { recursive: true, force: true });
    },
  };
}

async function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r, e) => {
    ws.onopen = r;
    ws.onerror = e;
  });
  let id = 0;
  const pendientes = new Map();
  const oyentes = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id !== undefined) {
      const p = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (msg.error) p?.rechazar(new Error(`${msg.error.message} (${msg.error.code})`));
      else p?.resolver(msg.result);
    } else {
      for (const o of oyentes) o(msg);
    }
  };
  return {
    enviar(metodo, params = {}, sessionId) {
      const n = ++id;
      ws.send(JSON.stringify({ id: n, method: metodo, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolver, rechazar) => pendientes.set(n, { resolver, rechazar }));
    },
    alEvento(fn) {
      oyentes.push(fn);
    },
    cerrar() {
      ws.close();
    },
  };
}

/** Abre una pestaña y devuelve su sessionId (modo "flatten"). */
export async function nuevaPagina(cdp) {
  const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.enviar('Target.attachToTarget', { targetId, flatten: true });
  await cdp.enviar('Page.enable', {}, sessionId);
  await cdp.enviar('Runtime.enable', {}, sessionId);
  return { targetId, sessionId };
}

export async function evaluar(cdp, sessionId, expresion) {
  const r = await cdp.enviar('Runtime.evaluate', { expression: expresion, returnByValue: true }, sessionId);
  return r.result.value;
}

export function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (v.length === 0) return NaN;
  const i = (v.length - 1) * p;
  const a = Math.floor(i);
  const b = Math.ceil(i);
  return v[a] + (v[b] - v[a]) * (i - a);
}

export function mediana(valores) {
  return percentil(valores, 0.5);
}
