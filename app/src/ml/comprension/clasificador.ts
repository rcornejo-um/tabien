// Inferencia de T1 con un modelo lineal: TS puro, sin runtimes de terceros.
//
// Todo buffer se reserva una vez en el constructor. El loop caliente (productos punto)
// no asigna memoria. Las únicas asignaciones por nota son los strings de anonimizar y
// normalizar, que no están en el loop interno.

import { anonimizar } from '../texto/anonimizar';
import { normalizar } from '../texto/normalizar';
import { hashearCubetas } from '../texto/tokenizar';
import type { ModeloLineal } from './modelo';

export class Clasificador {
  readonly etiquetas: readonly string[];
  private readonly m: ModeloLineal;
  private cubetas: Int32Array;
  private readonly tf: Float64Array; // denso, por cubeta; se limpia solo en las tocadas
  private tocadas: Int32Array;
  private readonly z: Float64Array;

  constructor(modelo: ModeloLineal) {
    this.m = modelo;
    this.etiquetas = modelo.manifiesto.etiquetas;
    this.cubetas = new Int32Array(1024);
    this.tf = new Float64Array(1 << modelo.bits);
    this.tocadas = new Int32Array(1024);
    this.z = new Float64Array(modelo.K);
  }

  /** Escribe en `salida` (largo K) la probabilidad de cada etiqueta para un texto original. */
  predecir(texto: string, salida: Float64Array): void {
    this.predecirNormalizado(normalizar(anonimizar(texto)), salida);
  }

  predecirNormalizado(normalizado: string, salida: Float64Array): void {
    const { idf, W, b, K } = this.m;
    let n = hashearCubetas(normalizado, this.m.bits, this.cubetas);
    while (n < 0) {
      // Nota más larga que nunca: se agranda una vez y queda así.
      this.cubetas = new Int32Array(this.cubetas.length * 2);
      this.tocadas = new Int32Array(this.cubetas.length);
      n = hashearCubetas(normalizado, this.m.bits, this.cubetas);
    }

    const tf = this.tf;
    const cubetas = this.cubetas;
    const tocadas = this.tocadas;
    let nt = 0;
    for (let i = 0; i < n; i++) {
      const j = cubetas[i] as number;
      if (tf[j] === 0) tocadas[nt++] = j;
      tf[j] = (tf[j] as number) + 1;
    }

    let norma2 = 0;
    for (let t = 0; t < nt; t++) {
      const j = tocadas[t] as number;
      const v = (tf[j] as number) * (idf[j] as number);
      norma2 += v * v;
    }
    const inv = norma2 > 0 ? 1 / Math.sqrt(norma2) : 0;

    const z = this.z;
    for (let k = 0; k < K; k++) z[k] = b[k] as number;
    for (let t = 0; t < nt; t++) {
      const j = tocadas[t] as number;
      const v = (tf[j] as number) * (idf[j] as number) * inv;
      const base = j * K;
      for (let k = 0; k < K; k++) z[k] = (z[k] as number) + v * (W[base + k] as number);
      tf[j] = 0;
    }

    for (let k = 0; k < K; k++) salida[k] = 1 / (1 + Math.exp(-(z[k] as number)));
  }
}
