// Capa de riesgo `riesgo-v1-prototipo`. Contrato: spec/riesgo.md.
// Corre SIEMPRE primero, sobre el texto original. Solo reglas.
// PROTOTIPO SIN REVISIÓN CLÍNICA: no usar con personas reales hasta revisar el léxico.

import lexico from '../../../../spec/riesgo/lexico-v1.json';

export const VERSION_RIESGO = lexico.version;

export type Categoria = 'suicidio_autolesion' | 'violencia' | 'crisis';

export interface ResultadoRiesgo {
  activado: boolean;
  categorias: Categoria[];
  reglas: string[];
}

const envolver = (patron: string, banderas = '') =>
  new RegExp(lexico.frontera.replace('PATRON', patron), banderas);

const EXCEPCIONES = lexico.excepciones.map((e) => envolver(e.patron, 'g'));
const REGLAS = lexico.reglas.map((r) => ({
  id: r.id,
  categoria: r.categoria as Categoria,
  patron: envolver(r.patron),
}));
const CATEGORIAS = [...new Set(REGLAS.map((r) => r.categoria))];

const ALARGADAS = /([a-zñ])\1{2,}/g;
const FUERA = /[^a-z0-9ñ]+/g;
const MARCAS = /[̀-ͯ]/g;

export function prepararRiesgo(texto: string): string {
  let t = '';
  for (const c of texto.normalize('NFKC').toLowerCase()) {
    t += c === 'ñ' ? c : c.normalize('NFD').replace(MARCAS, '');
  }
  return t.replace(ALARGADAS, '$1').replace(FUERA, ' ').trim();
}

export function evaluarRiesgo(texto: string): ResultadoRiesgo {
  let t = prepararRiesgo(texto);
  for (const e of EXCEPCIONES) t = t.replace(e, ' ');
  const reglas: string[] = [];
  const cats = new Set<Categoria>();
  for (const r of REGLAS) {
    if (r.patron.test(t)) {
      reglas.push(r.id);
      cats.add(r.categoria);
    }
  }
  return { activado: reglas.length > 0, categorias: CATEGORIAS.filter((c) => cats.has(c)), reglas };
}
