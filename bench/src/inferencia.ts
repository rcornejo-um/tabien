// Página del bench H2. Mide en el Worker y, como control, en el hilo principal.
// El control sirve para detectar si el freno de CPU de Chromium alcanza al Worker.

import { cargarTodo, medir, type ResultadoMedicion } from './medir';

declare global {
  interface Window {
    __resultado?: { worker: ResultadoMedicion; principal: ResultadoMedicion } | { error: string };
  }
}

async function enWorker(): Promise<ResultadoMedicion> {
  const w = new Worker(new URL('./worker-inferencia.ts', import.meta.url), { type: 'module' });
  return new Promise((resolver, rechazar) => {
    w.onmessage = (e: MessageEvent<ResultadoMedicion | { error: string }>) => {
      w.terminate();
      if ('error' in e.data) rechazar(new Error(`Worker: ${e.data.error}`));
      else resolver(e.data);
    };
    w.onerror = (e) => rechazar(new Error(e.message));
    w.postMessage('medir');
  });
}

async function main(): Promise<void> {
  const estado = document.getElementById('estado');
  try {
    const worker = await enWorker();
    const { clasificador, textos } = await cargarTodo();
    const principal = medir('principal', clasificador, textos, 5);
    window.__resultado = { worker, principal };
    if (estado) estado.textContent = 'listo';
  } catch (e) {
    window.__resultado = { error: String(e) };
    if (estado) estado.textContent = `error: ${String(e)}`;
  }
}

void main();
