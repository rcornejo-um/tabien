// M0: temas por palabras clave (spec/m0/palabras-v1.json). Transparente, sin entrenamiento.
// Es el piso de la escalera de modelos y el detector del prototipo mientras no haya un modelo publicable.

import palabras from '../../../../spec/m0/palabras-v1.json';
import { anonimizar } from '../texto/anonimizar';
import { normalizar } from '../texto/normalizar';
import { palabras as tokenizar } from '../texto/tokenizar';

export const VERSION_M0 = palabras.version;
export const TEMAS = Object.keys(palabras.temas);

interface Reglas {
  prefijos: string[];
  exactas: string[];
  frases: string[][];
}
const REGLAS = Object.entries(palabras.temas as Record<string, Reglas>);

/** Temas detectados en un texto original, en el orden de la taxonomía. */
export function temasM0(texto: string): string[] {
  const ws = tokenizar(normalizar(anonimizar(texto)));
  const salida: string[] = [];
  for (const [tema, r] of REGLAS) {
    const hay =
      ws.some((w) => r.exactas.includes(w) || r.prefijos.some((p) => w.startsWith(p))) ||
      r.frases.some((f) => ws.some((_, i) => f.every((fw, k) => ws[i + k] === fw)));
    if (hay) salida.push(tema);
  }
  return salida;
}
