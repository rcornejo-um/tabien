// Fixtures dorados del contrato texto-v1 (los mismos que corre pytest en Python).

import { describe, expect, it } from 'vitest';
import anon from '../../../../spec/fixtures/anonimizar.json';
import norm from '../../../../spec/fixtures/normalizar.json';
import tok from '../../../../spec/fixtures/tokenizar.json';
import hash from '../../../../spec/fixtures/hash.json';
import {
  PIPELINE_VERSION,
  anonimizar,
  cubetas,
  featuresDeTexto,
  features,
  fnv1a32,
  hashearCubetas,
  normalizar,
  palabras,
} from './index';

describe('versión de los fixtures', () => {
  it.each([anon, norm, tok, hash])('coincide con el runtime', (f) => {
    expect(f.version).toBe(PIPELINE_VERSION);
  });
});

describe('anonimizar', () => {
  it.each(anon.casos)('$id', ({ entrada, esperado }) => {
    expect(anonimizar(entrada)).toBe(esperado);
  });
});

describe('normalizar', () => {
  it.each(norm.casos)('$id', ({ entrada, esperado }) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it('es idempotente', () => {
    for (const { entrada } of norm.casos) {
      const una = normalizar(entrada);
      expect(normalizar(una)).toBe(una);
    }
  });

  it('las negaciones nunca desaparecen', () => {
    for (const neg of ['no', 'nunca', 'cero', 'nada', 'sin']) {
      expect(palabras(normalizar(`${neg.toUpperCase()} dormí bien`))).toContain(neg);
    }
  });
});

describe('tokenizar', () => {
  it.each(tok.palabras)('palabras: $id', ({ entrada, esperado }) => {
    expect(palabras(entrada)).toEqual(esperado);
  });

  it.each(tok.features)('features: $id', ({ entrada, esperado }) => {
    expect(features(entrada)).toEqual(esperado);
  });
});

describe('hash', () => {
  it.each(hash.casos)('$id', ({ entrada, esperado }) => {
    expect(fnv1a32(entrada)).toBe(esperado);
  });
});

describe('camino de inferencia = camino legible', () => {
  const textos = [
    ...norm.casos.map((c) => normalizar(c.entrada)),
    ...tok.palabras.map((c) => c.entrada),
    'dormi pesimo harta pega y cero ejercicio <emo_estres>',
    'año ñandu <rut> 10000 pasos x<3 <<emo_feliz>>',
  ];
  it.each([12, 14, 16, 18])('hashearCubetas con %i bits', (bits) => {
    const buffer = new Int32Array(4096);
    for (const t of textos) {
      const n = hashearCubetas(t, bits, buffer);
      expect(Array.from(buffer.subarray(0, n))).toEqual(cubetas(featuresDeTexto(t), bits));
    }
  });

  it('avisa con -1 si el buffer es muy chico', () => {
    expect(hashearCubetas('dormi pesimo anoche', 14, new Int32Array(3))).toBe(-1);
  });
});
