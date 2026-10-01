// Paridad del motor de patrones con la referencia Python (spec/fixtures/patrones.json).

import { describe, expect, it } from 'vitest';
import fixtures from '../../../../spec/fixtures/patrones.json';
import { VERSION_PATRONES, analizar, lgamma, type Analisis, type DiaPatron } from './index';

const TOL = 1e-9;
const NUMEROS = ['rho', 'p', 'rho_c', 'media_alto', 'media_bajo', 'q'] as const;

describe('motor de patrones: paridad Python ↔ TS', () => {
  it('versión', () => expect(fixtures.version).toBe(VERSION_PATRONES));

  it('lgamma de Lanczos', () => {
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 13);
    expect(lgamma(10)).toBeCloseTo(Math.log(362880), 12);
    expect(lgamma(37.5)).toBeCloseTo(97.5217752228882, 9); // math.lgamma(37.5) en Python
  });

  it.each(fixtures.casos)('$id', (caso) => {
    const r = analizar(caso.dias as DiaPatron[]);
    const e = caso.esperado as unknown as Analisis;
    expect(r.motivo).toBe(e.motivo);
    expect(r.dias_con_datos).toBe(e.dias_con_datos);
    expect(r.racha).toBe(e.racha);
    expect(r.pruebas.length).toBe(e.pruebas.length);
    r.pruebas.forEach((t, i) => {
      const te = e.pruebas[i];
      if (!te) throw new Error('falta prueba');
      expect([t.x, t.y, t.desfase, t.n, t.n_alto, t.n_bajo]).toEqual([te.x, te.y, te.desfase, te.n, te.n_alto, te.n_bajo]);
      for (const k of NUMEROS) expect(Math.abs(t[k] - te[k])).toBeLessThan(TOL);
    });
    expect(r.hallazgos.map((h) => [h.x, h.y, h.desfase, h.confianza])).toEqual(
      e.hallazgos.map((h) => [h.x, h.y, h.desfase, h.confianza]),
    );
    expect(r.tendencias.map((t) => t.variable)).toEqual(e.tendencias.map((t) => t.variable));
    r.tendencias.forEach((t, i) => expect(Math.abs(t.d - (e.tendencias[i]?.d ?? NaN))).toBeLessThan(TOL));
  });
});
