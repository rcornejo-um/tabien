import { describe, expect, it } from 'vitest';
import {
  AREAS, HABITOS, aceptar, adherencia, estadoInicial, evaluarProgreso, marcarDia, muyDificil, noAplica, sugerir,
  type EstadoRuta,
} from './index';

const MS = 86_400_000;
const mas = (f: string, n: number) => new Date(Date.parse(`${f}T00:00:00Z`) + n * MS).toISOString().slice(0, 10);
const HOY = '2026-10-01';

function conDias(e: EstadoRuta, desde: string, patron: boolean[]): EstadoRuta {
  return patron.reduce((acc, hecho, i) => marcarDia(acc, mas(desde, i), hecho), e);
}

describe('catálogo en el runtime', () => {
  it('cada paso de cada ruta existe y la dificultad no baja', () => {
    for (const [area, a] of Object.entries(AREAS)) {
      const d = a.pasos.map((id) => HABITOS.get(id)?.dificultad ?? -1);
      expect(d.every((x) => x > 0)).toBe(true);
      expect(d).toEqual([...d].sort());
      expect(area.length).toBeGreaterThan(0);
    }
  });
});

describe('selección v1', () => {
  it('sin metas ni hallazgos no propone nada', () => {
    expect(sugerir(estadoInicial(), [], HOY)).toBeNull();
  });

  it('propone el paso más fácil del primer candidato, con su porqué y el siguiente', () => {
    const s = sugerir(estadoInicial(), [{ area: 'pantallas', porque: 'Porque notamos X.' }], HOY);
    expect(s?.habito.id).toBe('p1');
    expect(s?.siguiente?.id).toBe('p2');
    expect(s?.porque).toBe('Porque notamos X.');
  });

  it('"no aplica" salta esa área por 30 días', () => {
    const c = [{ area: 'pantallas', porque: 'a' }, { area: 'agua', porque: 'b' }];
    let e = aceptar(estadoInicial(), sugerir(estadoInicial(), c, HOY)!, HOY);
    e = noAplica(e, HOY);
    expect(sugerir(e, c, mas(HOY, 1))?.habito.area).toBe('agua');
    expect(sugerir(e, c, mas(HOY, 31))?.habito.area).toBe('pantallas');
  });
});

describe('progresión', () => {
  const inicio = aceptar(estadoInicial(), sugerir(estadoInicial(), [{ area: 'movimiento', porque: 'p' }], HOY)!, HOY);

  it('antes de 7 días no se evalúa', () => {
    const e = conDias(inicio, HOY, [true, true, true]);
    expect(adherencia(e, mas(HOY, 3))).toBeNull();
    expect(evaluarProgreso(e, mas(HOY, 3)).cambio).toBe('sigue');
  });

  it('≥ 70% en 7 días avanza al siguiente paso', () => {
    const e = conDias(inicio, HOY, [true, true, true, true, true, false, false]);
    const r = evaluarProgreso(e, mas(HOY, 7));
    expect(r.cambio).toBe('avanza');
    expect(r.estado.activo?.pasoId).toBe('m2');
    expect(r.estado.completados).toContain('m1');
  });

  it('< 40% retrocede; en el primer paso, se queda con una semana nueva (fallar no castiga)', () => {
    const e = conDias(inicio, HOY, [true, false, false, true, false, false, false]);
    const r = evaluarProgreso(e, mas(HOY, 7));
    expect(r.cambio).toBe('retrocede');
    expect(r.estado.activo?.pasoId).toBe('m1');
    expect(r.estado.activo?.desde).toBe(mas(HOY, 7));
  });

  it('"muy difícil" en m2 vuelve a m1', () => {
    let e = conDias(inicio, HOY, Array(7).fill(true));
    e = evaluarProgreso(e, mas(HOY, 7)).estado;
    expect(e.activo?.pasoId).toBe('m2');
    e = muyDificil(e, mas(HOY, 8));
    expect(e.activo?.pasoId).toBe('m1');
  });

  it('completar el último paso cierra la ruta', () => {
    let e = inicio;
    let f = HOY;
    for (let i = 0; i < 3; i++) {
      e = conDias(e, f, Array(7).fill(true));
      f = mas(f, 7);
      e = evaluarProgreso(e, f).estado;
    }
    expect(e.activo).toBeNull();
    expect(e.completados).toEqual(expect.arrayContaining(['m1', 'm2', 'm3']));
    expect(e.eventos.at(-1)?.tipo).toBe('completa');
  });
});
