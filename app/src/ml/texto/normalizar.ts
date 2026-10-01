// Paso 2 del contrato texto-v1: normalizar (N1…N7 de spec/texto.md).

import emojis from '../../../../spec/emojis.json';

const SE_ELIMINA = new Set(emojis.se_elimina.map((cp) => parseInt(cp, 16)));
const RANGOS: ReadonlyArray<readonly [number, number]> = emojis.rangos_emoji.map(
  ([a, b]) => [parseInt(a ?? '', 16), parseInt(b ?? '', 16)] as const,
);
const EMOJI_A_TOKEN = new Map<number, string>(
  Object.entries(emojis.emoji_a_token).map(([cp, tok]) => [parseInt(cp, 16), tok]),
);
const TOKEN_OTRO = emojis.token_otro;

const ALARGADAS = /([a-zñ])\1{2,}/g;
const NUMERO_UNIDAD = /([0-9])([a-zñ])/g;
const FUERA_DE_ALFABETO = /[^a-z0-9ñ_<> ]/g;
const ESPACIOS = / +/g;
const MARCAS = /[̀-ͯ]/g;

function esEmoji(cp: number): boolean {
  for (const [a, b] of RANGOS) {
    if (cp >= a && cp <= b) return true;
  }
  return false;
}

function n3(texto: string): string {
  let salida = '';
  for (const c of texto) {
    const cp = c.codePointAt(0) ?? 0;
    if (SE_ELIMINA.has(cp)) continue;
    const token = EMOJI_A_TOKEN.get(cp);
    if (token !== undefined) salida += ` ${token} `;
    else if (esEmoji(cp)) salida += ` ${TOKEN_OTRO} `;
    else if (c === 'ñ') salida += c;
    else salida += c.normalize('NFD').replace(MARCAS, '');
  }
  return salida;
}

export function normalizar(texto: string): string {
  texto = texto.normalize('NFKC'); // N1
  texto = texto.toLowerCase(); // N2
  texto = n3(texto); // N3
  texto = texto.replace(ALARGADAS, '$1'); // N4
  texto = texto.replace(NUMERO_UNIDAD, '$1 $2'); // N5
  texto = texto.replace(FUERA_DE_ALFABETO, ' '); // N6
  texto = texto.replace(ESPACIOS, ' '); // N7
  let inicio = 0;
  let fin = texto.length;
  while (inicio < fin && texto.charCodeAt(inicio) === 32) inicio++;
  while (fin > inicio && texto.charCodeAt(fin - 1) === 32) fin--;
  return texto.slice(inicio, fin);
}
