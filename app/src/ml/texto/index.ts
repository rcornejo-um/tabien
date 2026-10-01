// Pipeline de texto texto-v1 (runtime TS). Contrato: spec/texto.md.

import { anonimizar } from './anonimizar';
import { normalizar } from './normalizar';
import { featuresDeTexto } from './tokenizar';

export const PIPELINE_VERSION = 'texto-v1';

export { anonimizar } from './anonimizar';
export { normalizar } from './normalizar';
export {
  palabras,
  features,
  featuresDeTexto,
  fnv1a32,
  cubetas,
  hashearCubetas,
} from './tokenizar';

/** Texto original → features (anonimizar → normalizar → tokenizar). */
export function preparar(texto: string): string[] {
  return featuresDeTexto(normalizar(anonimizar(texto)));
}
