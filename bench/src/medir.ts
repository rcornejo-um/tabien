// Medición compartida por el Worker y el hilo principal (H2).

import { Clasificador } from '../../app/src/ml/comprension/clasificador';
import { cargarModelo, type Manifiesto } from '../../app/src/ml/comprension/modelo';

export interface ResultadoMedicion {
  donde: 'worker' | 'principal';
  notas: number;
  repeticiones: number;
  tiemposMs: number[]; // uno por nota y repetición
  totalMs: number;
  resolucionMs: number;
  aisladoOrigen: boolean;
}

export async function cargarTodo(): Promise<{ clasificador: Clasificador; textos: string[] }> {
  const [manifiesto, pesos, paridad] = await Promise.all([
    fetch('/manifest.json').then((r) => r.json() as Promise<Manifiesto>),
    fetch('/weights.bin').then((r) => r.arrayBuffer()),
    fetch('/paridad.json').then((r) => r.json() as Promise<{ casos: { texto: string }[] }>),
  ]);
  // v000 no es publicable: solo se permite cargar en benchmarks y tests.
  const clasificador = new Clasificador(cargarModelo(manifiesto, pesos, true));
  return { clasificador, textos: paridad.casos.map((c) => c.texto) };
}

function resolucion(): number {
  let min = Infinity;
  for (let i = 0; i < 2000; i++) {
    const a = performance.now();
    let b = performance.now();
    while (b === a) b = performance.now();
    min = Math.min(min, b - a);
  }
  return min;
}

export function medir(
  donde: ResultadoMedicion['donde'],
  clasificador: Clasificador,
  textos: string[],
  repeticiones: number,
): ResultadoMedicion {
  const salida = new Float64Array(clasificador.etiquetas.length);
  for (let i = 0; i < 2; i++) for (const t of textos) clasificador.predecir(t, salida); // calentar el JIT
  const tiempos = new Array<number>(textos.length * repeticiones);
  let n = 0;
  const inicio = performance.now();
  for (let r = 0; r < repeticiones; r++) {
    for (const t of textos) {
      const a = performance.now();
      clasificador.predecir(t, salida);
      tiempos[n++] = performance.now() - a;
    }
  }
  return {
    donde,
    notas: textos.length,
    repeticiones,
    tiemposMs: tiempos,
    totalMs: performance.now() - inicio,
    resolucionMs: resolucion(),
    aisladoOrigen: globalThis.crossOriginIsolated === true,
  };
}
