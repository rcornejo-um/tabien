// Del historial a los hallazgos: arma la entrada del motor y redacta frases NO causales.

import { analizar, type Analisis, type DiaPatron, type Hallazgo, type Tendencia } from '../ml/patrones/index';
import { TEMAS, temasM0 } from '../ml/temas/m0';
import type { RegistroDia } from './dominio';

const MS_DIA = 86_400_000;
const indiceDia = (fecha: string) => Math.round(Date.parse(`${fecha}T00:00:00Z`) / MS_DIA);

/** Registros → días del motor. Los días con riesgo no aportan temas (spec/patrones.md). */
export function aDiasPatron(registros: readonly RegistroDia[]): DiaPatron[] {
  return registros.map((r) => {
    const conTemas = r.texto !== null && !r.riesgo?.activado;
    const temas = conTemas ? temasM0(r.texto as string) : [];
    const valores: DiaPatron['valores'] = {};
    for (const t of TEMAS) valores[t] = conTemas ? Number(temas.includes(t)) : null;
    valores.sueno_horas = r.suenoHoras;
    valores.pasos = r.pasos;
    valores.vasos_agua = r.vasosAgua;
    valores.tono = null; // sin modelo de tono (T2) en el prototipo
    return { dia: indiceDia(r.fecha), valores };
  });
}

const NOMBRE_TEMA: Record<string, string> = {
  estres: 'estrés', ejercicio: 'ejercicio', pantallas: 'pantallas', social: 'tu vida social',
  estudio_trabajo: 'estudio o trabajo', alimentacion: 'comida', descanso: 'descanso', animo: 'tu ánimo',
};
const ES_TEMA = (v: string) => v in NOMBRE_TEMA;

export function horasYMinutos(h: number): string {
  const total = Math.round(Math.abs(h) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} min`;
  return mm === 0 ? `${hh} h` : `${hh} h ${mm} min`;
}

function cantidad(variable: string, valor: number, diferencia = false): string {
  const v = diferencia ? Math.abs(valor) : valor;
  if (variable === 'sueno_horas') return horasYMinutos(v);
  if (variable === 'pasos') return `${(Math.round(v / 100) * 100).toLocaleString('es-CL')} pasos`;
  const n = Math.round(v * 10) / 10;
  return `${n.toLocaleString('es-CL')} ${n === 1 ? 'vaso' : 'vasos'} de agua`;
}

const VERBO_Y: Record<string, (dif: string, mas: boolean, cuando: string) => string> = {
  sueno_horas: (dif, mas, cuando) => `${cuando} sueles dormir ${dif} ${mas ? 'más' : 'menos'}`,
  pasos: (dif, mas, cuando) => `${cuando} sueles caminar ${dif} ${mas ? 'más' : 'menos'}`,
  vasos_agua: (dif, mas, cuando) => `${cuando} sueles tomar ${dif} ${mas ? 'más' : 'menos'}`,
};

export interface FraseHallazgo {
  titulo: string;
  evidencia: string;
  confianza: string;
}

export function fraseHallazgo(h: Hallazgo): FraseHallazgo {
  const mas = h.media_alto > h.media_bajo;
  const dif = cantidad(h.y, h.media_alto - h.media_bajo, true);
  const cuandoY = h.y === 'sueno_horas' ? 'esa noche' : '';
  let sujeto: string;
  let grupoAlto: string;
  let grupoBajo: string;
  if (ES_TEMA(h.x)) {
    sujeto = `Los días que escribes sobre ${NOMBRE_TEMA[h.x]},`;
    grupoAlto = 'esos días';
    grupoBajo = 'el resto';
  } else if (h.x === 'sueno_horas') {
    sujeto = 'Después de las noches en que duermes más,';
    grupoAlto = 'tras noches largas';
    grupoBajo = 'tras noches cortas';
  } else {
    const nombre = h.x === 'pasos' ? 'que caminas más' : 'que tomas más agua';
    sujeto = `Los días ${nombre},`;
    grupoAlto = 'esos días';
    grupoBajo = 'los días de menos';
  }
  const verbo = VERBO_Y[h.y] ?? ((d: string, m: boolean, c: string) => `${c} sueles registrar ${d} ${m ? 'más' : 'menos'}`);
  const titulo = `${sujeto} ${verbo(dif, mas, cuandoY).trim()}.`;
  const evidencia =
    `En promedio, ${cantidad(h.y, h.media_alto)} ${grupoAlto} y ${cantidad(h.y, h.media_bajo)} ${grupoBajo} ` +
    `(${h.n_alto} y ${h.n_bajo} días). Es una asociación en tus datos, no una causa: puede haber otras razones.`;
  return { titulo, evidencia, confianza: h.confianza === 'alta' ? 'Confianza alta' : 'Confianza media' };
}

export function fraseTendencia(t: Tendencia): string {
  const sube = t.d > 0;
  const que = { sueno_horas: 'duermes', pasos: 'caminas', vasos_agua: 'tomas' }[t.variable] ?? 'registras';
  return (
    `Esta semana ${que} en promedio ${cantidad(t.variable, t.media_reciente)}, ` +
    `${sube ? 'más' : 'menos'} que en las 3 semanas anteriores (${cantidad(t.variable, t.media_base)}).`
  );
}

export interface VistaHallazgos {
  estado: 'oculto_por_riesgo' | 'pocos_dias' | 'sin_hallazgos' | 'con_hallazgos';
  diasConDatos: number;
  faltan: number;
  hallazgos: FraseHallazgo[];
  tendencias: string[];
  racha: number | null;
  analisis: Analisis | null;
}

export function vistaHallazgos(registros: readonly RegistroDia[], hoy: string): VistaHallazgos {
  const deHoy = registros.find((r) => r.fecha === hoy);
  // Un día con riesgo: no se muestran hallazgos, tendencias ni rachas.
  if (deHoy?.riesgo?.activado) {
    return { estado: 'oculto_por_riesgo', diasConDatos: 0, faltan: 0, hallazgos: [], tendencias: [], racha: null, analisis: null };
  }
  const a = analizar(aDiasPatron(registros));
  const minimo = 14;
  const ultimos = [...registros].sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, a.racha);
  const racha = ultimos.some((r) => r.riesgo?.activado) ? null : a.racha;
  return {
    estado: a.motivo === 'pocos_dias' ? 'pocos_dias' : a.hallazgos.length ? 'con_hallazgos' : 'sin_hallazgos',
    diasConDatos: a.dias_con_datos,
    faltan: Math.max(0, minimo - a.dias_con_datos),
    hallazgos: a.hallazgos.map(fraseHallazgo),
    tendencias: a.tendencias.map(fraseTendencia),
    racha,
    analisis: a,
  };
}

export interface DiaDemo {
  dias_atras: number;
  texto: string | null;
  suenoHoras: number | null;
  pasos: number | null;
  vasosAgua: number | null;
}

/** Carga la persona inventada de ejemplo, terminando ayer. Pasa por la capa de riesgo como todo. */
export async function cargarDemo(
  repo: import('./registro').Repositorio,
  dias: readonly DiaDemo[],
  hoy: Date,
): Promise<number> {
  const { guardarDia } = await import('./registro');
  const { fechaLocal } = await import('./dominio');
  const s = (n: number | null) => (n === null ? '' : String(n));
  let n = 0;
  for (const d of dias) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - d.dias_atras);
    await guardarDia(
      repo,
      fechaLocal(fecha),
      { texto: d.texto ?? '', suenoHoras: s(d.suenoHoras), pasos: s(d.pasos), vasosAgua: s(d.vasosAgua) },
      hoy,
    );
    n++;
  }
  await repo.escribirMeta('demo', 'si');
  return n;
}
