import { describe, expect, it } from 'vitest';
import { temasM0 } from './m0';

describe('M0 (palabras clave)', () => {
  it.each([
    ['dormí pésimo, harta pega y cero ejercicio 😩', ['sueno', 'estres', 'ejercicio', 'estudio_trabajo']],
    ['nada especial', []],
    ['me siento sola', ['animo']],
    ['solo quiero dormir', ['sueno']],
    ['pegado en el celu hasta las 3', ['pantallas']],
    ['tomé harta agua 💧', ['hidratacion']],
    ['me siento la raja, salí con los cabros', ['social', 'animo']],
    ['no pegué pestaña', ['sueno']],
  ])('%s', (texto, esperado) => {
    expect(temasM0(texto).sort()).toEqual([...esperado].sort());
  });
});
