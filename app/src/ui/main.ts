// Capa de UI mínima de F0: sirve para medir H4 (carga diferida del modelo).
// La pantalla "Hoy" real llega en F1 (sin modelo) y F5 (completa).
//
// `?modelo=0` desactiva la carga del modelo: es la línea base del LT.

import type { MensajeSalida } from '../workers/comprension.worker';

declare global {
  interface Window {
    __tabien?: { modeloListoMs?: number; msCarga?: number; error?: string };
  }
}

const NOMBRES: Record<string, string> = {
  sueno: 'sueño',
  estres: 'estrés',
  alimentacion: 'alimentación',
  ejercicio: 'ejercicio',
  animo: 'ánimo',
  social: 'social',
  estudio_trabajo: 'estudio o trabajo',
  pantallas: 'pantallas',
  hidratacion: 'hidratación',
  descanso: 'descanso',
};

const estado: NonNullable<Window['__tabien']> = {};
window.__tabien = estado;

const form = document.getElementById('form-nota') as HTMLFormElement;
const nota = document.getElementById('nota') as HTMLTextAreaElement;
const entendi = document.getElementById('entendi') as HTMLParagraphElement;

let worker: Worker | undefined;
let siguienteId = 0;

function mostrar(m: Extract<MensajeSalida, { tipo: 'prediccion' }>): void {
  const temas = m.etiquetas
    .map((e, i) => ({ e, p: m.probs[i] ?? 0 }))
    .filter(({ p }) => p >= 0.5)
    .sort((a, b) => b.p - a.p)
    .map(({ e, p }) => `${NOMBRES[e] ?? e} ${Math.round(p * 100)}%`);
  entendi.textContent = temas.length ? temas.join(' · ') : 'No reconocí un tema claro en tu nota.';
}

function cargarModeloEnDiferido(): void {
  worker = new Worker(new URL('../workers/comprension.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (e: MessageEvent<MensajeSalida>) => {
    const m = e.data;
    if (m.tipo === 'listo') {
      estado.modeloListoMs = performance.now();
      estado.msCarga = m.msCarga;
    } else if (m.tipo === 'prediccion') {
      mostrar(m);
    } else {
      estado.error = m.mensaje;
      entendi.textContent = 'No pude cargar la comprensión de notas. Tu nota igual queda guardada.';
    }
  };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = nota.value.trim();
  if (!texto) return;
  if (!worker) {
    entendi.textContent = 'Todavía estoy preparando la comprensión de notas…';
    return;
  }
  entendi.textContent = 'Leyendo…';
  worker.postMessage({ tipo: 'predecir', id: siguienteId++, texto });
});

if (import.meta.env.MODE === 'lt') {
  (document.getElementById('aviso') as HTMLElement).hidden = false;
}

// Carga diferida: después del evento load y cuando el hilo principal esté libre.
if (new URLSearchParams(location.search).get('modelo') !== '0') {
  const cuandoLibre = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1);
  if (document.readyState === 'complete') cuandoLibre(cargarModeloEnDiferido);
  else addEventListener('load', () => cuandoLibre(cargarModeloEnDiferido), { once: true });
}
