// Motor de patrones `patrones-v1` (runtime TS). Contrato: spec/patrones.md.
// Replica función por función la referencia Python (ml/src/patrones); un fixture verifica la paridad.

import config from '../../../../spec/patrones/config-v1.json';

export const VERSION_PATRONES = config.version;

export type Valores = Record<string, number | null | undefined>;
export interface DiaPatron {
  dia: number;
  valores: Valores;
}

export interface Prueba {
  x: string;
  y: string;
  desfase: number;
  n: number;
  rho: number;
  p: number;
  rho_c: number;
  media_alto: number;
  n_alto: number;
  media_bajo: number;
  n_bajo: number;
  q: number;
}

export interface Hallazgo extends Prueba {
  confianza: 'alta' | 'media';
}

export interface Tendencia {
  variable: string;
  media_reciente: number;
  media_base: number;
  d: number;
  n_reciente: number;
  n_base: number;
}

export interface Analisis {
  version: string;
  motivo: 'pocos_dias' | null;
  dias_con_datos: number;
  hallazgos: Hallazgo[];
  tendencias: Tendencia[];
  pruebas: Prueba[];
  racha: number;
}

type Config = typeof config;
const tipo = (v: string) => (config.variables as Record<string, { tipo: string }>)[v]?.tipo;

// ----------------------------- estadística ---------------------------------------------------

export function rangos(v: readonly number[]): number[] {
  const orden = v.map((_, i) => i).sort((a, b) => (v[a] as number) - (v[b] as number) || a - b);
  const r = new Array<number>(v.length).fill(0);
  let i = 0;
  while (i < orden.length) {
    let j = i;
    while (j + 1 < orden.length && v[orden[j + 1] as number] === v[orden[i] as number]) j++;
    const promedio = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[orden[k] as number] = promedio;
    i = j + 1;
  }
  return r;
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] as number;
    mb += b[i] as number;
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] as number) - ma;
    const db = (b[i] as number) - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return sab / Math.sqrt(saa * sbb);
}

export function spearman(a: readonly number[], b: readonly number[]): number {
  return pearson(rangos(a), rangos(b));
}

// Lanczos (g = 7, 9 coeficientes): error relativo ~1e-15 en el rango que se usa.
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LANCZOS[0] as number;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += (LANCZOS[i] as number) / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  const eps = 1e-15;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  d = 1 / (Math.abs(d) > tiny ? d : tiny);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) > tiny ? d : tiny);
    c = 1 + aa / c;
    c = Math.abs(c) > tiny ? c : tiny;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) > tiny ? d : tiny);
    c = 1 + aa / c;
    c = Math.abs(c) > tiny ? c : tiny;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }
  return h;
}

export function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const ln = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x);
  if (x < (a + 1) / (a + b + 2)) return (Math.exp(ln) * betacf(a, b, x)) / a;
  return 1 - (Math.exp(ln) * betacf(b, a, 1 - x)) / b;
}

export function pSpearman(rho: number, n: number): number {
  if (Math.abs(rho) >= 1 - 1e-12) return 0;
  const gl = n - 2;
  const t2 = (rho * rho * gl) / (1 - rho * rho);
  return betaInc(gl / 2, 0.5, gl / (gl + t2));
}

export function benjaminiHochberg(p: readonly number[]): number[] {
  const m = p.length;
  const orden = p.map((_, i) => i).sort((a, b) => (p[a] as number) - (p[b] as number) || a - b);
  const q = new Array<number>(m).fill(0);
  let minimo = 1;
  for (let rango = m; rango >= 1; rango--) {
    const i = orden[rango - 1] as number;
    minimo = Math.min(minimo, ((p[i] as number) * m) / rango);
    q[i] = Math.min(minimo, 1);
  }
  return q;
}

function mediana(v: readonly number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}

const media = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;

// ----------------------------- motor ---------------------------------------------------------

export function analizar(dias: readonly DiaPatron[], c: Config = config): Analisis {
  const porDia = new Map<number, Valores>();
  for (const d of dias) porDia.set(d.dia, d.valores);
  const conDatos = [...porDia.entries()]
    .filter(([, v]) => Object.values(v).some((x) => x !== null && x !== undefined))
    .map(([k]) => k)
    .sort((a, b) => a - b);
  if (conDatos.length < c.dias_minimos) {
    return {
      version: c.version, motivo: 'pocos_dias', dias_con_datos: conDatos.length,
      hallazgos: [], tendencias: [], pruebas: [], racha: racha(conDatos),
    };
  }

  const desfases = c.desfase_por_y as Record<string, number>;
  const pruebas: Omit<Prueba, 'q'>[] = [];
  for (const x of c.x) {
    for (const y of c.y) {
      if (x === y) continue;
      const L = desfases[y] ?? 0;
      // El mismo día, x→y e y→x son la misma correlación: se prueba una sola vez.
      if (L === 0 && c.y.includes(x) && c.x.includes(y) && desfases[x] === 0 && x > y) continue;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const d of conDatos) {
        const vx = porDia.get(d)?.[x];
        const vy = porDia.get(d + L)?.[y];
        if (vx !== null && vx !== undefined && vy !== null && vy !== undefined) {
          xs.push(vx);
          ys.push(vy);
        }
      }
      const n = xs.length;
      if (n < c.pares_minimos || new Set(xs).size < 2 || new Set(ys).size < 2) continue;
      let alto: number[];
      let bajo: number[];
      if (tipo(x) === 'tema') {
        alto = ys.filter((_, i) => xs[i] === 1);
        bajo = ys.filter((_, i) => xs[i] === 0);
      } else {
        const med = mediana(xs);
        alto = ys.filter((_, i) => (xs[i] as number) > med);
        bajo = ys.filter((_, i) => (xs[i] as number) < med);
      }
      if (alto.length < c.minimo_por_grupo || bajo.length < c.minimo_por_grupo) continue;
      const rho = spearman(xs, ys);
      pruebas.push({
        x, y, desfase: L, n, rho, p: pSpearman(rho, n),
        rho_c: (rho * n) / (n + c.contraccion_n0),
        media_alto: media(alto), n_alto: alto.length, media_bajo: media(bajo), n_bajo: bajo.length,
      });
    }
  }

  const qs = benjaminiHochberg(pruebas.map((t) => t.p));
  const conQ: Prueba[] = pruebas.map((t, i) => ({ ...t, q: qs[i] as number }));
  const hallazgos: Hallazgo[] = conQ
    .filter((t) => t.q <= c.q_fdr && Math.abs(t.rho_c) >= c.rho_minimo)
    .sort(
      (a, b) =>
        a.q - b.q ||
        Math.abs(b.rho_c) - Math.abs(a.rho_c) ||
        (a.x < b.x ? -1 : a.x > b.x ? 1 : 0) ||
        (a.y < b.y ? -1 : a.y > b.y ? 1 : 0),
    )
    .map((t) => ({ ...t, confianza: t.q <= 0.01 && t.n >= 30 ? 'alta' : 'media' }));

  return {
    version: c.version, motivo: null, dias_con_datos: conDatos.length, hallazgos,
    tendencias: tendencias(porDia, conDatos, c.tendencias), pruebas: conQ, racha: racha(conDatos),
  };
}

function tendencias(porDia: Map<number, Valores>, conDatos: number[], t: Config['tendencias']): Tendencia[] {
  const D = conDatos[conDatos.length - 1] as number;
  const salida: Tendencia[] = [];
  for (const variable of ['sueno_horas', 'pasos', 'vasos_agua']) {
    const valor = (d: number) => porDia.get(d)?.[variable];
    const rec = conDatos
      .filter((d) => D - t.ventana_reciente < d && d <= D && valor(d) != null)
      .map((d) => valor(d) as number);
    const base = conDatos
      .filter((d) => D - t.ventana_reciente - t.ventana_base < d && d <= D - t.ventana_reciente && valor(d) != null)
      .map((d) => valor(d) as number);
    if (rec.length < t.minimo_reciente || base.length < t.minimo_base) continue;
    const mb = media(base);
    const de = Math.sqrt(base.reduce((s, v) => s + (v - mb) ** 2, 0) / (base.length - 1));
    if (de === 0) continue;
    const d = (media(rec) - mb) / de;
    if (Math.abs(d) >= t.d_minimo) {
      salida.push({ variable, media_reciente: media(rec), media_base: mb, d, n_reciente: rec.length, n_base: base.length });
    }
  }
  return salida;
}

function racha(conDatos: number[]): number {
  if (conDatos.length === 0) return 0;
  let r = 1;
  for (let i = conDatos.length - 1; i > 0; i--) {
    if ((conDatos[i] as number) - (conDatos[i - 1] as number) !== 1) break;
    r++;
  }
  return r;
}
