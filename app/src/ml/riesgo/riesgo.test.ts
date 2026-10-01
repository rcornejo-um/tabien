import { describe, expect, it } from 'vitest';
import fixtures from '../../../../spec/fixtures/riesgo.json';
import { VERSION_RIESGO, evaluarRiesgo, prepararRiesgo } from './index';

describe('capa de riesgo (fixtures compartidos con Python)', () => {
  it('versión', () => expect(fixtures.version).toBe(VERSION_RIESGO));

  it.each(fixtures.preparacion)('preparación: $id', ({ entrada, esperado }) => {
    expect(prepararRiesgo(entrada)).toBe(esperado);
  });

  it.each(fixtures.casos)('$id', ({ entrada, esperado }) => {
    const r = evaluarRiesgo(entrada);
    expect(r.categorias).toEqual(esperado);
    expect(r.activado).toBe(esperado.length > 0);
  });
});
