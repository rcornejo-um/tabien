// Solo en builds de Limit Tests (`vite build --mode lt`): carga diferida del modelo de mecánica
// y tarjeta "Esto entendí". El build del piloto no incluye este módulo ni ningún modelo.
// `?modelo=0` desactiva la carga (línea base del LT H4).

import type { RegistroDia } from '../core/dominio';
import type { MensajeSalida } from '../workers/comprension.worker';

const NOMBRES: Record<string, string> = {
  sueno: 'sueño', estres: 'estrés', alimentacion: 'alimentación', ejercicio: 'ejercicio',
  animo: 'ánimo', social: 'social', estudio_trabajo: 'estudio o trabajo', pantallas: 'pantallas',
  hidratacion: 'hidratación', descanso: 'descanso',
};

const tarjeta = document.getElementById('tarjeta-entendi') as HTMLElement;
const entendi = document.getElementById('entendi') as HTMLElement;
let worker: Worker | undefined;
let id = 0;

function cargar(): void {
  worker = new Worker(new URL('../workers/comprension.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<MensajeSalida>) => {
    const m = e.data;
    if (m.tipo === 'prediccion') {
      const temas = m.etiquetas
        .map((et, i) => ({ et, p: m.probs[i] ?? 0 }))
        .filter(({ p }) => p >= 0.5)
        .sort((a, b) => b.p - a.p)
        .map(({ et, p }) => `${NOMBRES[et] ?? et} ${Math.round(p * 100)}%`);
      entendi.textContent = temas.length ? temas.join(' · ') : 'No reconocí un tema claro en tu nota.';
      tarjeta.hidden = false;
    } else if (m.tipo === 'error') {
      entendi.textContent = 'No pude cargar la comprensión de notas. Tu nota igual quedó guardada.';
      tarjeta.hidden = false;
    }
  };
}

window.addEventListener('tabien:guardado', (e) => {
  const r = (e as CustomEvent<RegistroDia>).detail;
  if (!r.texto) return;
  if (!worker) {
    entendi.textContent = 'Todavía estoy preparando la comprensión de notas…';
    tarjeta.hidden = false;
    return;
  }
  worker.postMessage({ tipo: 'predecir', id: id++, texto: r.texto });
});

if (new URLSearchParams(location.search).get('modelo') !== '0') {
  const cuandoLibre = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1);
  if (document.readyState === 'complete') cuandoLibre(cargar);
  else addEventListener('load', () => cuandoLibre(cargar), { once: true });
}
