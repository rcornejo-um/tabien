import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cargarDemo, vistaHallazgos, type DiaDemo } from './hallazgos';
import { candidatos, guardarEstado, leerEstado, vistaRuta } from './rutas';
import { RepositorioMemoria } from './memoria';
import { fechaLocal } from './dominio';
import { aceptar, estadoInicial } from '../ml/rutas/index';

const demo = JSON.parse(readFileSync(new URL('../../public/demo/persona-demo.json', import.meta.url), 'utf8')) as { dias: DiaDemo[] };
const HOY = new Date(2026, 9, 1, 20, 0);
const F = fechaLocal(HOY);

describe('rutas en la app', () => {
  it('sin metas ni hallazgos: pide elegir una meta', () => {
    expect(vistaRuta(estadoInicial(), null, F, false).estado).toBe('sin_candidatos');
  });

  it('las metas van primero y explican su porqué', () => {
    const c = candidatos(['agua'], null);
    expect(c[0]).toEqual({ area: 'agua', porque: 'Porque elegiste «Tomar agua» como meta.' });
  });

  it('con la persona de ejemplo, los hallazgos proponen un área con su porqué y fuente', async () => {
    const repo = new RepositorioMemoria();
    await cargarDemo(repo, demo.dias, HOY);
    const a = vistaHallazgos(await repo.listar(), F).analisis;
    const v = vistaRuta(estadoInicial(), a, F, false);
    expect(v.estado).toBe('propuesta');
    expect(v.sugerencia?.porque).toMatch(/^Porque notamos esto: «/);
    expect(v.fuentes.length).toBeGreaterThan(0);
    expect(v.pasoEnRuta?.actual).toBe(1);
  });

  it('día con riesgo: no se propone nada', () => {
    const e = { ...estadoInicial(), metas: ['agua'] };
    expect(vistaRuta(e, null, F, true).estado).toBe('oculto_por_riesgo');
  });

  it('el estado se guarda y se recupera', async () => {
    const repo = new RepositorioMemoria();
    const e0 = { ...estadoInicial(), metas: ['sueno'] };
    const s = vistaRuta(e0, null, F, false).sugerencia!;
    await guardarEstado(repo, aceptar(e0, s, F));
    const e = await leerEstado(repo);
    expect(e.activo?.pasoId).toBe('s1');
    expect(vistaRuta(e, null, F, false).estado).toBe('activa');
  });
});
