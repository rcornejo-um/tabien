import { describe, expect, it } from 'vitest';
import { fechaLocal, type EntradaDia } from './dominio';
import { ErrorEntrada, guardarDia, validar } from './registro';
import { construirExportacion, MARCA_OMITIDA, nuevoCodigoParticipante } from './exportar';
import { RepositorioMemoria } from './memoria';

const vacia: EntradaDia = { texto: '', suenoHoras: '', pasos: '', vasosAgua: '' };
const AHORA = new Date('2026-10-01T22:00:00-03:00');

describe('validar', () => {
  it('acepta solo nota', () => {
    expect(validar({ ...vacia, texto: '  dormí pésimo  ' })).toEqual({
      texto: 'dormí pésimo', suenoHoras: null, pasos: null, vasosAgua: null,
    });
  });

  it('acepta coma decimal y redondea el sueño a media hora', () => {
    expect(validar({ ...vacia, suenoHoras: '7,3' }).suenoHoras).toBe(7.5);
  });

  it('rechaza un día vacío con un mensaje que guía', () => {
    expect(() => validar(vacia)).toThrow(/escribe una nota o agrega un dato/);
  });

  it.each([
    ['suenoHoras', '25', /entre 0 y 16/],
    ['pasos', '12,5', /sin decimales/],
    ['vasosAgua', 'muchos', /tienen que ser un número/],
  ] as const)('rechaza %s = %s', (campo, valor, msg) => {
    try {
      validar({ ...vacia, [campo]: valor });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorEntrada);
      expect((e as ErrorEntrada).campo).toBe(campo);
      expect((e as Error).message).toMatch(msg);
    }
  });
});

describe('guardarDia', () => {
  it('corre la capa de riesgo y guarda su resultado', async () => {
    const repo = new RepositorioMemoria();
    const r = await guardarDia(repo, '2026-10-01', { ...vacia, texto: 'quiero morirme' }, AHORA);
    expect(r.riesgo?.activado).toBe(true);
    expect(r.riesgo?.categorias).toEqual(['suicidio_autolesion']);
    expect((await repo.obtener('2026-10-01'))?.riesgo?.activado).toBe(true);
  });

  it('al editar el mismo día conserva la fecha de creación', async () => {
    const repo = new RepositorioMemoria();
    await guardarDia(repo, '2026-10-01', { ...vacia, texto: 'hola' }, new Date('2026-10-01T10:00:00Z'));
    const r = await guardarDia(repo, '2026-10-01', { ...vacia, texto: 'chao' }, new Date('2026-10-01T20:00:00Z'));
    expect(r.creado).toBe('2026-10-01T10:00:00.000Z');
    expect(r.texto).toBe('chao');
    expect(await repo.listar()).toHaveLength(1);
  });
});

describe('exportación del piloto', () => {
  it('anonimiza, omite días con riesgo y no expone fechas', async () => {
    const repo = new RepositorioMemoria();
    await guardarDia(repo, '2026-09-28', { ...vacia, texto: 'llámame al +56 9 1234 5678', pasos: '8000' }, AHORA);
    await guardarDia(repo, '2026-09-30', { ...vacia, texto: 'ya no quiero vivir' }, AHORA);
    await guardarDia(repo, '2026-10-01', { ...vacia, suenoHoras: '6' }, AHORA);
    const e = construirExportacion(await repo.listar(), 'ABCD2345');
    expect(e.dias.map((d) => d.dia)).toEqual([0, 2, 3]);
    expect(e.dias[0]?.texto).toBe('llámame al <telefono>');
    expect(e.dias[0]?.dia_semana).toBe(0); // 28-09-2026 es lunes
    expect(e.dias[1]?.texto).toBe(MARCA_OMITIDA);
    expect(e.dias[2]?.texto).toBeNull();
    expect(e.omitidas_por_seguridad).toBe(1);
    expect(JSON.stringify(e)).not.toMatch(/2026-|creado|actualizado|12345678/);
  });

  it('código de participante: 8 caracteres sin ambiguos', () => {
    const c = nuevoCodigoParticipante((n) => Uint8Array.from({ length: n }, (_, i) => i * 37));
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});

describe('fechaLocal', () => {
  it('usa el día local, no UTC', () => {
    expect(fechaLocal(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01');
  });
});
