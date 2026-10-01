// Worker de comprensión: carga el modelo y responde predicciones. Nunca toca el DOM.

import { Clasificador } from '../ml/comprension/clasificador';
import { cargarModelo, type Manifiesto } from '../ml/comprension/modelo';

export type MensajeEntrada = { tipo: 'predecir'; id: number; texto: string };
export type MensajeSalida =
  | { tipo: 'listo'; msCarga: number }
  | { tipo: 'prediccion'; id: number; etiquetas: string[]; probs: number[] }
  | { tipo: 'error'; mensaje: string };

// Solo los builds de Limit Tests pueden cargar un modelo que no pasó la compuerta.
const PERMITIR_NO_PUBLICABLE = import.meta.env.MODE === 'lt';

let clasificador: Clasificador | undefined;
let salida: Float64Array | undefined;

async function iniciar(): Promise<void> {
  const t0 = performance.now();
  const [manifiesto, pesos] = await Promise.all([
    fetch('/modelo/manifest.json').then((r) => r.json() as Promise<Manifiesto>),
    fetch('/modelo/weights.bin').then((r) => r.arrayBuffer()),
  ]);
  clasificador = new Clasificador(cargarModelo(manifiesto, pesos, PERMITIR_NO_PUBLICABLE));
  salida = new Float64Array(clasificador.etiquetas.length);
  postMessage({ tipo: 'listo', msCarga: performance.now() - t0 } satisfies MensajeSalida);
}

const listo = iniciar().catch((e: unknown) => {
  postMessage({ tipo: 'error', mensaje: String(e) } satisfies MensajeSalida);
});

addEventListener('message', async (e: MessageEvent<MensajeEntrada>) => {
  await listo;
  if (!clasificador || !salida) return;
  clasificador.predecir(e.data.texto, salida);
  postMessage({
    tipo: 'prediccion',
    id: e.data.id,
    etiquetas: [...clasificador.etiquetas],
    probs: Array.from(salida),
  } satisfies MensajeSalida);
});
