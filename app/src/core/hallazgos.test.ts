import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cargarDemo, fraseHallazgo, horasYMinutos, vistaHallazgos, type DiaDemo } from './hallazgos';
import { guardarDia } from './registro';
import { RepositorioMemoria } from './memoria';
import { fechaLocal } from './dominio';
import type { Hallazgo } from '../ml/patrones/index';

const demo = JSON.parse(readFileSync(new URL('../../public/demo/persona-demo.json', import.meta.url), 'utf8')) as { dias: DiaDemo[] };
const HOY = new Date(2026, 9, 1, 20, 0);
const CAUSAL_O_CLINICO = /\b(causa|causan|provoca|produce|debido|porque|por culpa|insomnio|depresi|ansiedad|trastorno|diagn)/i;

describe('hallazgos en la app', () => {
  it('horas y minutos', () => {
    expect(horasYMinutos(1.1667)).toBe('1 h 10 min');
    expect(horasYMinutos(0.5)).toBe('30 min');
    expect(horasYMinutos(7)).toBe('7 h');
  });

  it('la persona de ejemplo, vista con M0, muestra hallazgos con frases no causales', async () => {
    const repo = new RepositorioMemoria();
    await cargarDemo(repo, demo.dias, HOY);
    const v = vistaHallazgos(await repo.listar(), fechaLocal(HOY));
    expect(v.estado).toBe('con_hallazgos');
    expect(v.hallazgos.length).toBeGreaterThanOrEqual(2);
    for (const h of v.hallazgos) {
      const sinAviso = h.evidencia.replace(/Es una asociación en tus datos, no una causa: puede haber otras razones\./, '');
      expect(h.titulo + ' ' + sinAviso).not.toMatch(CAUSAL_O_CLINICO);
      expect(h.evidencia).toMatch(/no una causa/);
    }
    console.info(v.hallazgos.map((h) => `${h.titulo} [${h.confianza}]`).join('\n'));
  });

  it('menos de 14 días: dice cuántos faltan', async () => {
    const repo = new RepositorioMemoria();
    await cargarDemo(repo, demo.dias.slice(-10), HOY);
    const v = vistaHallazgos(await repo.listar(), fechaLocal(HOY));
    expect(v.estado).toBe('pocos_dias');
    expect(v.faltan).toBe(4);
  });

  it('si hoy se activó la capa de riesgo, no se muestra nada', async () => {
    const repo = new RepositorioMemoria();
    await cargarDemo(repo, demo.dias, HOY);
    await guardarDia(repo, fechaLocal(HOY), { texto: 'ya no quiero vivir', suenoHoras: '', pasos: '', vasosAgua: '' }, HOY);
    const v = vistaHallazgos(await repo.listar(), fechaLocal(HOY));
    expect(v.estado).toBe('oculto_por_riesgo');
    expect(v.racha).toBeNull();
    expect(v.hallazgos).toEqual([]);
  });

  it('plantillas: ninguna combinación usa lenguaje causal', () => {
    const xs = ['estres', 'ejercicio', 'pantallas', 'social', 'estudio_trabajo', 'alimentacion', 'descanso', 'animo', 'sueno_horas', 'pasos', 'vasos_agua'];
    const ys = ['sueno_horas', 'pasos', 'vasos_agua'];
    for (const x of xs) for (const y of ys) for (const signo of [1, -1]) {
      const h = { x, y, desfase: y === 'sueno_horas' ? 1 : 0, n: 40, rho: 0.5 * signo, p: 0.001, rho_c: 0.4 * signo,
        media_alto: 7 + signo, n_alto: 20, media_bajo: 7, n_bajo: 20, q: 0.01, confianza: 'alta' } as Hallazgo;
      const f = fraseHallazgo(h);
      expect(f.titulo).not.toMatch(CAUSAL_O_CLINICO);
      expect(f.titulo).toMatch(signo > 0 ? /más/ : /menos/);
    }
  });
});
