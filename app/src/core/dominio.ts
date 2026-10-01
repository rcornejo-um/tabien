// Dominio puro de Tabien. Nunca toca el DOM ni el almacenamiento.

import type { Categoria } from '../ml/riesgo/index';

/** Fecha local en formato AAAA-MM-DD (el "día" de la persona, no UTC). */
export type Fecha = string;

export interface RiesgoGuardado {
  activado: boolean;
  categorias: Categoria[];
  version: string;
}

export interface RegistroDia {
  fecha: Fecha;
  texto: string | null;
  suenoHoras: number | null;
  pasos: number | null;
  vasosAgua: number | null;
  /** Resultado de la capa de riesgo sobre `texto`. Se calcula SIEMPRE antes de guardar. */
  riesgo: RiesgoGuardado | null;
  creado: string;
  actualizado: string;
}

export interface EntradaDia {
  texto: string;
  suenoHoras: string;
  pasos: string;
  vasosAgua: string;
}

export function fechaLocal(d: Date): Fecha {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${dia}`;
}
