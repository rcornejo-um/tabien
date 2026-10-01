// Guardar el día: validar, correr la capa de riesgo PRIMERO y persistir.

import { VERSION_RIESGO, evaluarRiesgo } from '../ml/riesgo/index';
import type { EntradaDia, Fecha, RegistroDia } from './dominio';

export const LARGO_MAXIMO_NOTA = 2000;

export interface Repositorio {
  obtener(fecha: Fecha): Promise<RegistroDia | undefined>;
  guardar(r: RegistroDia): Promise<void>;
  listar(): Promise<RegistroDia[]>;
  borrarTodo(): Promise<void>;
  leerMeta(clave: string): Promise<string | undefined>;
  escribirMeta(clave: string, valor: string): Promise<void>;
}

/** Errores que se muestran tal cual: dicen qué pasó y qué hacer. */
export class ErrorEntrada extends Error {
  constructor(
    readonly campo: keyof EntradaDia,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

interface Rango {
  min: number;
  max: number;
  entero: boolean;
  nombre: string;
}

const RANGOS: Record<'suenoHoras' | 'pasos' | 'vasosAgua', Rango> = {
  suenoHoras: { min: 0, max: 16, entero: false, nombre: 'Las horas de sueño' },
  pasos: { min: 0, max: 100000, entero: true, nombre: 'Los pasos' },
  vasosAgua: { min: 0, max: 30, entero: true, nombre: 'Los vasos de agua' },
};

function numero(campo: 'suenoHoras' | 'pasos' | 'vasosAgua', valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  const r = RANGOS[campo];
  if (!Number.isFinite(n)) {
    throw new ErrorEntrada(campo, `${r.nombre} tienen que ser un número, por ejemplo ${r.entero ? '8' : '7,5'}.`);
  }
  if (n < r.min || n > r.max) {
    throw new ErrorEntrada(campo, `${r.nombre} van entre ${r.min} y ${r.max}. Revisa el número o déjalo vacío.`);
  }
  if (r.entero && !Number.isInteger(n)) {
    throw new ErrorEntrada(campo, `${r.nombre} van sin decimales.`);
  }
  return r.entero ? n : Math.round(n * 2) / 2; // sueño en medias horas
}

export function validar(entrada: EntradaDia): Pick<RegistroDia, 'texto' | 'suenoHoras' | 'pasos' | 'vasosAgua'> {
  const texto = entrada.texto.trim();
  if (texto.length > LARGO_MAXIMO_NOTA) {
    throw new ErrorEntrada('texto', `La nota es muy larga (máximo ${LARGO_MAXIMO_NOTA} caracteres). Puedes acortarla.`);
  }
  const r = {
    texto: texto === '' ? null : texto,
    suenoHoras: numero('suenoHoras', entrada.suenoHoras),
    pasos: numero('pasos', entrada.pasos),
    vasosAgua: numero('vasosAgua', entrada.vasosAgua),
  };
  if (r.texto === null && r.suenoHoras === null && r.pasos === null && r.vasosAgua === null) {
    throw new ErrorEntrada('texto', 'No hay nada que guardar todavía: escribe una nota o agrega un dato.');
  }
  return r;
}

export async function guardarDia(
  repo: Repositorio,
  fecha: Fecha,
  entrada: EntradaDia,
  ahora: Date,
): Promise<RegistroDia> {
  const datos = validar(entrada);
  // La capa de riesgo corre antes que cualquier otra cosa que lea el texto.
  const r = datos.texto === null ? null : evaluarRiesgo(datos.texto);
  const previo = await repo.obtener(fecha);
  const registro: RegistroDia = {
    fecha,
    ...datos,
    riesgo: r === null ? null : { activado: r.activado, categorias: r.categorias, version: VERSION_RIESGO },
    creado: previo?.creado ?? ahora.toISOString(),
    actualizado: ahora.toISOString(),
  };
  await repo.guardar(registro);
  return registro;
}
