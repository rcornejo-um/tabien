// Exportación para el piloto (D1). Se arma EN EL DISPOSITIVO y ya anonimizada.
// Solo se llama después de un consentimiento explícito para esa exportación.

import { anonimizar, PIPELINE_VERSION } from '../ml/texto/index';
import { VERSION_RIESGO, evaluarRiesgo } from '../ml/riesgo/index';
import type { RegistroDia } from './dominio';

export const FORMATO_EXPORTACION = 'tabien-export-v1';
export const MARCA_OMITIDA = '<omitida_por_seguridad>';

export interface DiaExportado {
  dia: number; // días desde el primer registro (no fechas: minimización)
  dia_semana: number; // 0 = lunes … 6 = domingo
  texto: string | null;
  sueno_horas: number | null;
  pasos: number | null;
  vasos_agua: number | null;
}

export interface Exportacion {
  formato: string;
  codigo_participante: string;
  anonimizacion: string;
  riesgo: string;
  dias: DiaExportado[];
  omitidas_por_seguridad: number;
}

function diaSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const js = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return (js + 6) % 7;
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

export function construirExportacion(registros: RegistroDia[], codigoParticipante: string): Exportacion {
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primero = ordenados[0]?.fecha ?? '1970-01-01';
  let omitidas = 0;
  const dias = ordenados.map((r): DiaExportado => {
    let texto: string | null = null;
    if (r.texto !== null) {
      // Se re-evalúa con el léxico actual, por si el registro se guardó con una versión anterior.
      const riesgo = r.riesgo?.activado || evaluarRiesgo(r.texto).activado;
      if (riesgo) {
        texto = MARCA_OMITIDA;
        omitidas++;
      } else {
        texto = anonimizar(r.texto);
      }
    }
    return {
      dia: diasEntre(primero, r.fecha),
      dia_semana: diaSemana(r.fecha),
      texto,
      sueno_horas: r.suenoHoras,
      pasos: r.pasos,
      vasos_agua: r.vasosAgua,
    };
  });
  return {
    formato: FORMATO_EXPORTACION,
    codigo_participante: codigoParticipante,
    anonimizacion: PIPELINE_VERSION,
    riesgo: VERSION_RIESGO,
    dias,
    omitidas_por_seguridad: omitidas,
  };
}

/** Código aleatorio, no derivado de la persona. Sirve para pedir el borrado de sus datos del piloto. */
export function nuevoCodigoParticipante(aleatorio: (n: number) => Uint8Array): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
  return Array.from(aleatorio(8), (b) => alfabeto[b % alfabeto.length]).join('');
}
