// Rutas de hábitos v1 (reglas). Catálogo: spec/rutas/catalogo-v1.json. Prompt maestro §6.7.
//
// - Selección: metas de la persona → áreas de los hallazgos → paso más fácil elegible del área.
// - Progresión: con 7 días en un paso, adherencia ≥ 70% avanza y < 40% retrocede ("la ruta se hace
//   más fácil": fallar no castiga). "Muy difícil" retrocede de inmediato. "No aplica" cambia de área.
// Todo es puro: recibe el estado y devuelve uno nuevo.

import catalogo from '../../../../spec/rutas/catalogo-v1.json';

export interface Habito {
  id: string;
  area: string;
  descripcion: string;
  dificultad: number;
  prerrequisitos: string[];
  evidencia: string[];
  contraindicaciones: string[];
}

export const HABITOS: ReadonlyMap<string, Habito> = new Map(catalogo.habitos.map((h) => [h.id, h as Habito]));
export const AREAS = catalogo.areas as Record<string, { nombre: string; pasos: string[] }>;
export const AREA_POR_VARIABLE = catalogo.areas_por_variable as Record<string, string>;
export const FUENTES = catalogo.fuentes as Record<string, { cita: string; url: string }>;

export const UMBRAL_AVANZA = 0.7;
export const UMBRAL_RETROCEDE = 0.4;
export const DIAS_VENTANA = 7;
export const DIAS_NO_APLICA = 30;

export interface Activo {
  area: string;
  pasoId: string;
  desde: string; // AAAA-MM-DD
  porque: string;
}

export interface EstadoRuta {
  version: 1;
  metas: string[];
  activo: Activo | null;
  checks: Record<string, boolean>;
  completados: string[];
  noAplica: Record<string, string>;
  eventos: { fecha: string; tipo: 'acepta' | 'muy_dificil' | 'no_aplica' | 'avanza' | 'retrocede' | 'completa'; pasoId: string }[];
}

export interface Candidato {
  area: string;
  porque: string;
}

export interface Sugerencia {
  habito: Habito;
  siguiente: Habito | null;
  porque: string;
}

export function estadoInicial(): EstadoRuta {
  return { version: 1, metas: [], activo: null, checks: {}, completados: [], noAplica: {}, eventos: [] };
}

const MS_DIA = 86_400_000;
const dia = (f: string) => Math.round(Date.parse(`${f}T00:00:00Z`) / MS_DIA);
const fecha = (d: number) => new Date(d * MS_DIA).toISOString().slice(0, 10);

function pasoElegible(area: string, completados: readonly string[]): Habito | null {
  const opciones = (AREAS[area]?.pasos ?? [])
    .map((id) => HABITOS.get(id))
    .filter((h): h is Habito => !!h && !completados.includes(h.id) && h.prerrequisitos.every((p) => completados.includes(p)));
  opciones.sort((a, b) => a.dificultad - b.dificultad);
  return opciones[0] ?? null;
}

function siguienteDe(h: Habito, completados: readonly string[]): Habito | null {
  return pasoElegible(h.area, [...completados, h.id]);
}

/** Qué proponer hoy. `candidatos` ya viene ordenado (metas primero, luego hallazgos). */
export function sugerir(estado: EstadoRuta, candidatos: readonly Candidato[], hoy: string): Sugerencia | null {
  if (estado.activo) {
    const h = HABITOS.get(estado.activo.pasoId);
    if (h) return { habito: h, siguiente: siguienteDe(h, estado.completados), porque: estado.activo.porque };
  }
  for (const c of candidatos) {
    const vetado = estado.noAplica[c.area];
    if (vetado && dia(hoy) - dia(vetado) < DIAS_NO_APLICA) continue;
    const h = pasoElegible(c.area, estado.completados);
    if (h) return { habito: h, siguiente: siguienteDe(h, estado.completados), porque: c.porque };
  }
  return null;
}

function evento(e: EstadoRuta, f: string, tipo: EstadoRuta['eventos'][number]['tipo'], pasoId: string): EstadoRuta['eventos'] {
  return [...e.eventos, { fecha: f, tipo, pasoId }].slice(-200);
}

export function aceptar(e: EstadoRuta, s: Sugerencia, hoy: string): EstadoRuta {
  return {
    ...e,
    activo: { area: s.habito.area, pasoId: s.habito.id, desde: hoy, porque: s.porque },
    checks: {},
    eventos: evento(e, hoy, 'acepta', s.habito.id),
  };
}

export function marcarDia(e: EstadoRuta, hoy: string, hecho: boolean): EstadoRuta {
  if (!e.activo) return e;
  return { ...e, checks: { ...e.checks, [hoy]: hecho } };
}

function pasoAnterior(h: Habito): Habito | null {
  const ruta = AREAS[h.area]?.pasos ?? [];
  const i = ruta.indexOf(h.id);
  const ant = i > 0 ? HABITOS.get(ruta[i - 1] as string) : undefined;
  return ant && ant.dificultad < h.dificultad ? ant : null;
}

/** Retroceder: el paso anterior más fácil; si no hay, el mismo paso con tiempo nuevo. */
function retroceder(e: EstadoRuta, hoy: string, tipo: 'retrocede' | 'muy_dificil'): EstadoRuta {
  if (!e.activo) return e;
  const h = HABITOS.get(e.activo.pasoId);
  if (!h) return e;
  const ant = pasoAnterior(h);
  return {
    ...e,
    activo: { ...e.activo, pasoId: ant?.id ?? h.id, desde: hoy },
    completados: ant ? e.completados.filter((id) => id !== ant.id) : e.completados,
    checks: {},
    eventos: evento(e, hoy, tipo, h.id),
  };
}

export function muyDificil(e: EstadoRuta, hoy: string): EstadoRuta {
  return retroceder(e, hoy, 'muy_dificil');
}

export function noAplica(e: EstadoRuta, hoy: string): EstadoRuta {
  if (!e.activo) return e;
  return {
    ...e,
    activo: null,
    checks: {},
    noAplica: { ...e.noAplica, [e.activo.area]: hoy },
    eventos: evento(e, hoy, 'no_aplica', e.activo.pasoId),
  };
}

export function adherencia(e: EstadoRuta, hoy: string): { dias: number; hechos: number; tasa: number } | null {
  if (!e.activo) return null;
  const inicio = dia(e.activo.desde);
  const h = dia(hoy);
  if (h - inicio < DIAS_VENTANA) return null;
  let hechos = 0;
  for (let d = h - DIAS_VENTANA; d < h; d++) if (e.checks[fecha(d)]) hechos++;
  return { dias: DIAS_VENTANA, hechos, tasa: hechos / DIAS_VENTANA };
}

export type Cambio = 'sigue' | 'avanza' | 'retrocede' | 'completa';

/** Se llama al abrir la app: si ya pasaron 7 días en el paso, decide si avanza o retrocede. */
export function evaluarProgreso(e: EstadoRuta, hoy: string): { estado: EstadoRuta; cambio: Cambio } {
  const a = adherencia(e, hoy);
  if (!e.activo || !a) return { estado: e, cambio: 'sigue' };
  const h = HABITOS.get(e.activo.pasoId);
  if (!h) return { estado: e, cambio: 'sigue' };
  if (a.tasa >= UMBRAL_AVANZA) {
    const completados = [...new Set([...e.completados, h.id])];
    const sig = pasoElegible(h.area, completados);
    if (!sig) {
      return {
        estado: { ...e, activo: null, checks: {}, completados, eventos: evento(e, hoy, 'completa', h.id) },
        cambio: 'completa',
      };
    }
    return {
      estado: { ...e, activo: { ...e.activo, pasoId: sig.id, desde: hoy }, checks: {}, completados, eventos: evento(e, hoy, 'avanza', h.id) },
      cambio: 'avanza',
    };
  }
  if (a.tasa < UMBRAL_RETROCEDE) return { estado: retroceder(e, hoy, 'retrocede'), cambio: 'retrocede' };
  return { estado: e, cambio: 'sigue' };
}
