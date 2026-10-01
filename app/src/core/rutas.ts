// Rutas en la app: candidatos (metas + hallazgos), persistencia del estado y vista.

import type { Analisis } from '../ml/patrones/index';
import {
  AREAS, AREA_POR_VARIABLE, FUENTES, estadoInicial, evaluarProgreso, sugerir,
  type Candidato, type Cambio, type EstadoRuta, type Habito, type Sugerencia,
} from '../ml/rutas/index';
import { fraseHallazgo } from './hallazgos';
import type { Repositorio } from './registro';

export const MAX_METAS = 2;

export function candidatos(metas: readonly string[], analisis: Analisis | null): Candidato[] {
  const salida: Candidato[] = metas
    .filter((a) => AREAS[a])
    .map((a) => ({ area: a, porque: `Porque elegiste «${AREAS[a]?.nombre}» como meta.` }));
  for (const h of analisis?.hallazgos ?? []) {
    const area = AREA_POR_VARIABLE[h.x] ?? AREA_POR_VARIABLE[h.y];
    if (!area || salida.some((c) => c.area === area)) continue;
    const t = fraseHallazgo(h).titulo;
    salida.push({ area, porque: `Porque notamos esto: «${t.charAt(0).toLowerCase()}${t.slice(1, -1)}».` });
  }
  return salida;
}

export async function leerEstado(repo: Repositorio): Promise<EstadoRuta> {
  const crudo = await repo.leerMeta('ruta');
  if (!crudo) return estadoInicial();
  try {
    const e = JSON.parse(crudo) as EstadoRuta;
    return e.version === 1 ? e : estadoInicial();
  } catch {
    return estadoInicial();
  }
}

export async function guardarEstado(repo: Repositorio, e: EstadoRuta): Promise<void> {
  await repo.escribirMeta('ruta', JSON.stringify(e));
}

export interface VistaRuta {
  estado: 'oculto_por_riesgo' | 'sin_candidatos' | 'propuesta' | 'activa';
  sugerencia: Sugerencia | null;
  cambio: Cambio;
  hechoHoy: boolean | null;
  pasoEnRuta: { actual: number; total: number } | null;
  fuentes: { cita: string; url: string }[];
  estadoRuta: EstadoRuta;
}

export function vistaRuta(e0: EstadoRuta, analisis: Analisis | null, hoy: string, riesgoHoy: boolean): VistaRuta {
  if (riesgoHoy) {
    return { estado: 'oculto_por_riesgo', sugerencia: null, cambio: 'sigue', hechoHoy: null, pasoEnRuta: null, fuentes: [], estadoRuta: e0 };
  }
  const { estado: e, cambio } = evaluarProgreso(e0, hoy);
  const s = sugerir(e, candidatos(e.metas, analisis), hoy);
  if (!s) return { estado: 'sin_candidatos', sugerencia: null, cambio, hechoHoy: null, pasoEnRuta: null, fuentes: [], estadoRuta: e };
  const ruta = AREAS[s.habito.area]?.pasos ?? [];
  return {
    estado: e.activo ? 'activa' : 'propuesta',
    sugerencia: s,
    cambio,
    hechoHoy: e.activo ? (e.checks[hoy] ?? null) : null,
    pasoEnRuta: { actual: ruta.indexOf(s.habito.id) + 1, total: ruta.length },
    fuentes: fuentesDe(s.habito),
    estadoRuta: e,
  };
}

function fuentesDe(h: Habito): { cita: string; url: string }[] {
  return h.evidencia.map((f) => FUENTES[f]).filter((f): f is { cita: string; url: string } => !!f);
}
