// Carga de modelos `tabien-lineal-v1` (weights.bin + manifest.json). Ver docs/ml-spec.md.

import { PIPELINE_VERSION } from '../texto/index';

export const FORMATO = 'tabien-lineal-v1';

interface Seccion {
  offset: number;
  dtype: string;
  largo: number;
}

export interface Manifiesto {
  formato: string;
  version: string;
  pipeline_version: string;
  publicable: boolean;
  bits: number;
  cubetas: number;
  etiquetas: string[];
  dtype: 'float32' | 'float16' | 'int8';
  layout: string;
  endianness: string;
  secciones: Record<string, Seccion>;
  umbrales: number[];
  sha256_pesos: string;
}

/** Pesos descuantizados en float32, listos para inferir. W: [cubeta * K + etiqueta]. */
export interface ModeloLineal {
  manifiesto: Manifiesto;
  bits: number;
  K: number;
  idf: Float32Array;
  W: Float32Array;
  b: Float32Array;
}

export class ErrorModelo extends Error {}

function f16aF32(h: number): number {
  const signo = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const frac = h & 0x3ff;
  if (exp === 0) return signo * frac * 2 ** -24;
  if (exp === 31) return frac ? NaN : signo * Infinity;
  return signo * (1 + frac / 1024) * 2 ** (exp - 15);
}

function leerF32(vista: DataView, s: Seccion): Float32Array {
  const salida = new Float32Array(s.largo);
  for (let i = 0; i < s.largo; i++) salida[i] = vista.getFloat32(s.offset + i * 4, true);
  return salida;
}

/**
 * Valida el manifiesto y descuantiza los pesos. Se llama una sola vez, al cargar.
 * `permitirNoPublicable` solo debe ser true en tests y benchmarks.
 */
export function cargarModelo(
  manifiesto: Manifiesto,
  binario: ArrayBuffer,
  permitirNoPublicable = false,
): ModeloLineal {
  if (manifiesto.formato !== FORMATO) {
    throw new ErrorModelo(`Formato de modelo desconocido: ${manifiesto.formato}`);
  }
  if (manifiesto.pipeline_version !== PIPELINE_VERSION) {
    throw new ErrorModelo(
      `El modelo usa ${manifiesto.pipeline_version} y este runtime ${PIPELINE_VERSION}: no se carga.`,
    );
  }
  if (!manifiesto.publicable && !permitirNoPublicable) {
    throw new ErrorModelo(`El modelo ${manifiesto.version} no pasó la compuerta de publicación.`);
  }
  if (manifiesto.layout !== 'cubeta-etiqueta' || manifiesto.endianness !== 'little') {
    throw new ErrorModelo('Disposición de pesos no soportada.');
  }
  const { idf: sIdf, b: sB, W: sW, escalas: sEsc } = manifiesto.secciones;
  const K = manifiesto.etiquetas.length;
  const nb = manifiesto.cubetas;
  if (!sIdf || !sB || !sW || nb !== 1 << manifiesto.bits || sW.largo !== nb * K) {
    throw new ErrorModelo('Manifiesto incompleto o inconsistente.');
  }
  const vista = new DataView(binario);
  const W = new Float32Array(nb * K);
  if (manifiesto.dtype === 'float32') {
    for (let i = 0; i < W.length; i++) W[i] = vista.getFloat32(sW.offset + i * 4, true);
  } else if (manifiesto.dtype === 'float16') {
    for (let i = 0; i < W.length; i++) W[i] = f16aF32(vista.getUint16(sW.offset + i * 2, true));
  } else {
    if (!sEsc) throw new ErrorModelo('Falta la sección de escalas para int8.');
    const escalas = leerF32(vista, sEsc);
    for (let j = 0; j < nb; j++) {
      for (let k = 0; k < K; k++) {
        const i = j * K + k;
        // int8 × float32 es exacto en float64; al guardar se redondea a float32, igual que numpy.
        W[i] = vista.getInt8(sW.offset + i) * (escalas[k] ?? 0);
      }
    }
  }
  return { manifiesto, bits: manifiesto.bits, K, idf: leerF32(vista, sIdf), W, b: leerF32(vista, sB) };
}
