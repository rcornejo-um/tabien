// LT0-ML · H3: paridad de predicciones Python ↔ TS con los mismos pesos exportados.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Clasificador } from './clasificador';
import { cargarModelo, ErrorModelo, type Manifiesto } from './modelo';

const CARPETA = new URL('../../../../ml/registry/v000/', import.meta.url);

function leerJson<T>(nombre: string): T {
  return JSON.parse(readFileSync(new URL(nombre, CARPETA), 'utf8')) as T;
}

function leerPesos(): ArrayBuffer {
  const bytes = readFileSync(new URL('weights.bin', CARPETA));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

interface Paridad {
  tolerancia: number;
  casos: { texto: string; probs: number[] }[];
}

const manifiesto = leerJson<Manifiesto>('manifest.json');
const paridad = leerJson<Paridad>('paridad.json');

describe('carga del modelo', () => {
  it('rechaza un modelo no publicable fuera de tests', () => {
    expect(() => cargarModelo(manifiesto, leerPesos())).toThrow(ErrorModelo);
  });

  it('rechaza otra versión del pipeline', () => {
    const otro = { ...manifiesto, pipeline_version: 'texto-v0' };
    expect(() => cargarModelo(otro, leerPesos(), true)).toThrow(/no se carga/);
  });
});

describe('paridad Python ↔ TS (H3)', () => {
  const clasificador = new Clasificador(cargarModelo(manifiesto, leerPesos(), true));
  const salida = new Float64Array(manifiesto.etiquetas.length);

  it(`todas las predicciones dentro de la tolerancia (${paridad.casos.length} notas)`, () => {
    let maxDelta = 0;
    let fuera = 0;
    for (const { texto, probs } of paridad.casos) {
      clasificador.predecir(texto, salida);
      for (let k = 0; k < probs.length; k++) {
        const d = Math.abs((salida[k] as number) - (probs[k] as number));
        if (d > maxDelta) maxDelta = d;
        if (d > paridad.tolerancia) fuera++;
      }
    }
    console.info(`H3: máx |Δp| = ${maxDelta.toExponential(2)} en ${paridad.casos.length} notas`);
    expect(fuera).toBe(0);
  });

  it('el estado interno no se filtra entre notas', () => {
    const [a, b] = paridad.casos;
    if (!a || !b) throw new Error('faltan casos');
    clasificador.predecir(b.texto, salida);
    clasificador.predecir(a.texto, salida);
    a.probs.forEach((p, k) => expect(salida[k]).toBeCloseTo(p, 5));
  });
});
