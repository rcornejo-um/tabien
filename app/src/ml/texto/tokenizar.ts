// Paso 3 del contrato texto-v1: palabras, features y hashing FNV-1a.
//
// Hay dos caminos que deben dar lo mismo:
// - `palabras` / `features` / `cubetas`: versión legible, con strings (tests y depuración).
// - `hashearCubetas`: versión de inferencia, sin armar strings de n-gramas.
// Un test verifica que ambos coinciden.

export const N_MIN = 2;
export const N_MAX = 5;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIMO = 0x01000193;

const MENOR = 60; // '<'
const MAYOR = 62; // '>'
const INICIO = 94; // '^'
const FIN = 36; // '$'

function esLetraDePalabra(cu: number): boolean {
  // [a-z0-9ñ_]
  return (
    (cu >= 97 && cu <= 122) || (cu >= 48 && cu <= 57) || cu === 0xf1 || cu === 95
  );
}

/** Mezcla una unidad de código (BMP, sin surrogates) en el hash, codificada en UTF-8. */
function mezclar(h: number, cu: number): number {
  if (cu < 0x80) {
    return Math.imul(h ^ cu, FNV_PRIMO) >>> 0;
  }
  if (cu < 0x800) {
    h = Math.imul(h ^ (0xc0 | (cu >> 6)), FNV_PRIMO) >>> 0;
    return Math.imul(h ^ (0x80 | (cu & 0x3f)), FNV_PRIMO) >>> 0;
  }
  h = Math.imul(h ^ (0xe0 | (cu >> 12)), FNV_PRIMO) >>> 0;
  h = Math.imul(h ^ (0x80 | ((cu >> 6) & 0x3f)), FNV_PRIMO) >>> 0;
  return Math.imul(h ^ (0x80 | (cu & 0x3f)), FNV_PRIMO) >>> 0;
}

function mezclarAscii(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) h = mezclar(h, s.charCodeAt(i));
  return h;
}

const H_PALABRA = mezclarAscii(FNV_OFFSET, 'w:');
const H_NGRAMA = mezclarAscii(FNV_OFFSET, 'c:');

/** FNV-1a de 32 bits sobre UTF-8 (camino general, acepta cualquier string). */
export function fnv1a32(s: string): number {
  let h = FNV_OFFSET;
  for (const c of s) {
    const cp = c.codePointAt(0) ?? 0;
    if (cp < 0x10000) {
      h = mezclar(h, cp);
    } else {
      h = Math.imul(h ^ (0xf0 | (cp >> 18)), FNV_PRIMO) >>> 0;
      h = Math.imul(h ^ (0x80 | ((cp >> 12) & 0x3f)), FNV_PRIMO) >>> 0;
      h = Math.imul(h ^ (0x80 | ((cp >> 6) & 0x3f)), FNV_PRIMO) >>> 0;
      h = Math.imul(h ^ (0x80 | (cp & 0x3f)), FNV_PRIMO) >>> 0;
    }
  }
  return h;
}

/**
 * Recorre las palabras de un texto normalizado, equivalente a /<[a-z0-9ñ_]+>|[a-z0-9ñ_]+/g.
 * Llama a `alEncontrar(inicio, fin, esEtiqueta)` sin crear strings.
 */
function recorrerPalabras(
  s: string,
  alEncontrar: (inicio: number, fin: number, esEtiqueta: boolean) => void,
): void {
  const largo = s.length;
  let i = 0;
  while (i < largo) {
    const cu = s.charCodeAt(i);
    if (cu === MENOR) {
      let j = i + 1;
      while (j < largo && esLetraDePalabra(s.charCodeAt(j))) j++;
      if (j > i + 1 && j < largo && s.charCodeAt(j) === MAYOR) {
        alEncontrar(i, j + 1, true);
        i = j + 1;
      } else {
        i++;
      }
    } else if (esLetraDePalabra(cu)) {
      let j = i + 1;
      while (j < largo && esLetraDePalabra(s.charCodeAt(j))) j++;
      alEncontrar(i, j, false);
      i = j;
    } else {
      i++;
    }
  }
}

export function palabras(normalizado: string): string[] {
  const salida: string[] = [];
  recorrerPalabras(normalizado, (a, b) => salida.push(normalizado.slice(a, b)));
  return salida;
}

export function features(palabra: string): string[] {
  const salida = [`w:${palabra}`];
  if (palabra.startsWith('<')) return salida;
  const marcada = `^${palabra}$`;
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let i = 0; i + n <= marcada.length; i++) salida.push(`c:${marcada.slice(i, i + n)}`);
  }
  return salida;
}

export function featuresDeTexto(normalizado: string): string[] {
  return palabras(normalizado).flatMap(features);
}

export function cubetas(feats: readonly string[], bits: number): number[] {
  const mascara = (1 << bits) - 1;
  return feats.map((f) => fnv1a32(f) & mascara);
}

/** Cantidad de features que produce una palabra de `largo` caracteres (sin contar etiquetas). */
export function featuresPorPalabra(largo: number): number {
  const m = largo + 2;
  let total = 1;
  for (let n = N_MIN; n <= N_MAX; n++) total += Math.max(0, m - n + 1);
  return total;
}

/**
 * Camino de inferencia: escribe en `salida` las cubetas de todas las features del texto
 * normalizado, en el mismo orden que `cubetas(featuresDeTexto(s), bits)`.
 * Devuelve cuántas escribió, o -1 si `salida` es muy chica (quien llama la agranda).
 */
export function hashearCubetas(s: string, bits: number, salida: Int32Array): number {
  const mascara = (1 << bits) - 1;
  let n = 0;
  let desborde = false;
  recorrerPalabras(s, (a, b, esEtiqueta) => {
    if (desborde) return;
    const necesarias = esEtiqueta ? 1 : featuresPorPalabra(b - a);
    if (n + necesarias > salida.length) {
      desborde = true;
      return;
    }
    let h = H_PALABRA;
    for (let k = a; k < b; k++) h = mezclar(h, s.charCodeAt(k));
    salida[n++] = h & mascara;
    if (esEtiqueta) return;
    // Palabra marcada virtual: m[0] = '^', m[1..L] = palabra, m[L+1] = '$'.
    const L = b - a;
    const largoMarcada = L + 2;
    for (let tam = N_MIN; tam <= N_MAX; tam++) {
      for (let i = 0; i + tam <= largoMarcada; i++) {
        let g = H_NGRAMA;
        for (let k = i; k < i + tam; k++) {
          const cu = k === 0 ? INICIO : k === largoMarcada - 1 ? FIN : s.charCodeAt(a + k - 1);
          g = mezclar(g, cu);
        }
        salida[n++] = g & mascara;
      }
    }
  });
  return desborde ? -1 : n;
}
