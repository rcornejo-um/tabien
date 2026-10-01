// UI de Tabien: pestañas Hoy / Ruta / Notamos / Mis datos. Capa delgada: la lógica vive en core/.

import { fechaLocal, type EntradaDia, type RegistroDia } from '../core/dominio';
import { ErrorEntrada, guardarDia, type Repositorio } from '../core/registro';
import { construirExportacion, nuevoCodigoParticipante } from '../core/exportar';
import { RepositorioMemoria } from '../core/memoria';
import { RepositorioIndexedDB } from '../persistencia/indexeddb';
import { cargarDemo, vistaHallazgos, type DiaDemo } from '../core/hallazgos';
import { MAX_METAS, guardarEstado, leerEstado, vistaRuta } from '../core/rutas';
import { AREAS, aceptar, adherencia, marcarDia, muyDificil, noAplica, type EstadoRuta } from '../ml/rutas/index';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>('form-dia');
const campos = {
  texto: $<HTMLTextAreaElement>('nota'),
  suenoHoras: $<HTMLInputElement>('sueno'),
  pasos: $<HTMLInputElement>('pasos'),
  vasosAgua: $<HTMLInputElement>('agua'),
};
const estado = $('estado');
const ayuda = $('ayuda');

let repo: Repositorio;
let usandoMemoria = false;

function hoy(): string {
  return fechaLocal(new Date());
}

function limpiarErrores(): void {
  for (const k of Object.keys(campos)) {
    $(`error-${k}`).textContent = '';
    campos[k as keyof typeof campos].removeAttribute('aria-invalid');
  }
}

function mostrarAyuda(desdeNota: boolean): void {
  $('ayuda-intro').textContent = desdeNota
    ? 'Gracias por contarlo. Lo que escribiste suena difícil, y mereces apoyo. Estas líneas son gratuitas y confidenciales:'
    : 'Si estás pasando por un momento muy difícil, habla con alguien hoy. Estas líneas son gratuitas y confidenciales:';
  ayuda.hidden = false;
  window.scrollTo({ top: 0 });
  ayuda.focus();
}

function cargarEnFormulario(r: RegistroDia | undefined): void {
  const s = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
  campos.texto.value = r?.texto ?? '';
  campos.suenoHoras.value = s(r?.suenoHoras ?? null);
  campos.pasos.value = s(r?.pasos ?? null);
  campos.vasosAgua.value = s(r?.vasosAgua ?? null);
}

function item(titulo: string, detalle?: string, etiqueta?: string): HTMLLIElement {
  const li = document.createElement('li');
  const t = document.createElement('p');
  t.className = 'hallazgo-titulo';
  t.textContent = titulo;
  li.append(t);
  if (detalle) {
    const d = document.createElement('p');
    d.className = 'suave';
    d.textContent = detalle;
    li.append(d);
  }
  if (etiqueta) {
    const e = document.createElement('span');
    e.className = 'etiqueta';
    e.textContent = etiqueta;
    li.append(e);
  }
  return li;
}

async function pintarHallazgos(): Promise<void> {
  const registros = await repo.listar();
  const t0 = performance.now();
  const v = vistaHallazgos(registros, hoy());
  // Medición para bench/e2e: costo del motor de patrones en el hilo principal.
  (window as unknown as { __msHallazgos?: number }).__msHallazgos = performance.now() - t0;
  const estadoH = $('hallazgos-estado');
  const lista = $('lista-hallazgos');
  const tend = $('lista-tendencias');
  const racha = $('racha');
  lista.replaceChildren();
  tend.replaceChildren();
  racha.hidden = true;
  if (v.estado === 'oculto_por_riesgo') {
    estadoH.textContent = 'Hoy no mostramos patrones. Lo importante ahora eres tú.';
    return;
  }
  if (v.estado === 'pocos_dias') {
    estadoH.textContent =
      v.diasConDatos === 0
        ? 'Cuando lleves 14 días con notas o datos, te contamos lo que notamos.'
        : `Llevas ${v.diasConDatos} ${v.diasConDatos === 1 ? 'día' : 'días'}. Con ${v.faltan} más te contamos lo que notamos.`;
  } else if (v.estado === 'sin_hallazgos') {
    estadoH.textContent = `Revisamos ${v.diasConDatos} días y no encontramos nada claro todavía. Preferimos no inventar.`;
  } else {
    estadoH.textContent = `Basado en ${v.diasConDatos} días. Son asociaciones en tus datos, no causas.`;
  }
  lista.replaceChildren(...v.hallazgos.map((h) => item(h.titulo, h.evidencia, h.confianza)));
  tend.replaceChildren(...v.tendencias.map((t) => item(t)));
  if (v.racha !== null && v.racha >= 3) {
    racha.textContent = `Llevas ${v.racha} días seguidos registrando.`;
    racha.hidden = false;
  }
}

async function pintarHistorial(): Promise<void> {
  const lista = $('historial');
  const registros = (await repo.listar()).slice(0, 7);
  lista.replaceChildren(
    ...registros.map((r) => {
      const li = document.createElement('li');
      const fecha = document.createElement('span');
      fecha.className = 'suave';
      fecha.textContent = new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
      const texto = document.createElement('span');
      const datos = [
        r.suenoHoras !== null ? `${String(r.suenoHoras).replace('.', ',')} h de sueño` : '',
        r.pasos !== null ? `${r.pasos.toLocaleString('es-CL')} pasos` : '',
        r.vasosAgua !== null ? `${r.vasosAgua} vasos` : '',
      ].filter(Boolean);
      texto.textContent = [r.texto ?? '', datos.join(' · ')].filter(Boolean).join(' — ');
      li.append(fecha, texto);
      return li;
    }),
  );
  if (registros.length === 0) {
    const li = document.createElement('li');
    li.className = 'suave';
    li.textContent = 'Todavía no hay días guardados.';
    lista.append(li);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores();
  const entrada: EntradaDia = {
    texto: campos.texto.value,
    suenoHoras: campos.suenoHoras.value,
    pasos: campos.pasos.value,
    vasosAgua: campos.vasosAgua.value,
  };
  try {
    const r = await guardarDia(repo, hoy(), entrada, new Date());
    if (r.riesgo?.activado) {
      // Ese día: nada de hábitos, rutas ni rachas. Solo la nota guardada y la ayuda.
      estado.textContent = 'Tu nota quedó guardada en este dispositivo.';
      mostrarAyuda(true);
    } else {
      estado.textContent = usandoMemoria
        ? 'Guardado, pero solo hasta que cierres esta pestaña: este navegador no permite guardar datos.'
        : 'Guardado ✓';
      window.dispatchEvent(new CustomEvent('tabien:guardado', { detail: r }));
    }
    await pintarHistorial();
    await pintarHallazgos();
    await pintarRuta();
  } catch (err) {
    if (err instanceof ErrorEntrada) {
      $(`error-${err.campo}`).textContent = err.message;
      campos[err.campo].setAttribute('aria-invalid', 'true');
      campos[err.campo].focus();
    } else {
      estado.textContent = 'No pude guardar tu nota. Copia el texto para no perderlo e inténtalo de nuevo.';
    }
  }
});

$('abrir-ayuda').addEventListener('click', () => mostrarAyuda(false));

const consiento = $<HTMLInputElement>('consiento');
const botonExportar = $<HTMLButtonElement>('exportar');
consiento.addEventListener('change', () => {
  botonExportar.disabled = !consiento.checked;
});
botonExportar.addEventListener('click', async () => {
  if (!consiento.checked) return;
  let codigo = await repo.leerMeta('codigo_participante');
  if (!codigo) {
    codigo = nuevoCodigoParticipante((n) => crypto.getRandomValues(new Uint8Array(n)));
    await repo.escribirMeta('codigo_participante', codigo);
  }
  const exp = construirExportacion(await repo.listar(), codigo);
  const blob = new Blob([JSON.stringify(exp, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tabien-piloto-${codigo}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  // El consentimiento es por acción: se pide de nuevo para la próxima exportación.
  consiento.checked = false;
  botonExportar.disabled = true;
  $('estado-exportar').textContent =
    `Listo: ${exp.dias.length} días. Tu código de participante es ${codigo}; guárdalo por si quieres pedir que borren tus datos del piloto.`;
});

$('borrar').addEventListener('click', () => {
  $('confirmar-borrado').hidden = false;
  $('borrar-no').focus();
});
$('borrar-no').addEventListener('click', () => {
  $('confirmar-borrado').hidden = true;
});
$('borrar-si').addEventListener('click', async () => {
  await repo.borrarTodo();
  ruta = await leerEstado(repo);
  $('confirmar-borrado').hidden = true;
  cargarEnFormulario(undefined);
  ayuda.hidden = true;
  estado.textContent = '';
  $('estado-borrar').textContent = 'Listo: se borró todo de este dispositivo.';
  await pintarHistorial();
  await pintarHallazgos();
  await pintarRuta();
});

// ----------------------------- pestañas ------------------------------------------------------
const PESTANAS = ['hoy', 'ruta', 'notamos', 'datos'] as const;
type Pestana = (typeof PESTANAS)[number];

function activarPestana(p: Pestana, foco = false): void {
  for (const q of PESTANAS) {
    const tab = $(`tab-${q}`);
    const activa = q === p;
    tab.setAttribute('aria-selected', String(activa));
    tab.tabIndex = activa ? 0 : -1;
    $(`panel-${q}`).hidden = !activa;
  }
  if (foco) $(`tab-${p}`).focus();
  window.scrollTo({ top: 0 });
  try {
    sessionStorage.setItem('tabien:pestana', p);
  } catch {
    /* sin almacenamiento de sesión: no importa */
  }
}

PESTANAS.forEach((p, i) => {
  const tab = $(`tab-${p}`);
  tab.addEventListener('click', () => activarPestana(p));
  tab.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    const salto = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0;
    if (k === 'Home' || k === 'End' || salto) {
      e.preventDefault();
      const j = k === 'Home' ? 0 : k === 'End' ? PESTANAS.length - 1 : (i + salto + PESTANAS.length) % PESTANAS.length;
      activarPestana(PESTANAS[j] as Pestana, true);
    }
  });
});

$('cerrar-ayuda').addEventListener('click', () => {
  ayuda.hidden = true;
});

// ----------------------------- ruta ----------------------------------------------------------
let ruta: EstadoRuta;

const MENSAJE_CAMBIO = {
  avanza: '¡Bien! Pasaste al siguiente paso.',
  retrocede: 'Lo hicimos un poco más fácil. Ajustar el paso también es avanzar.',
  completa: 'Completaste esta ruta. Cuando quieras, empieza otra.',
  sigue: '',
} as const;

async function riesgoHoy(): Promise<boolean> {
  return (await repo.obtener(hoy()))?.riesgo?.activado === true;
}

async function guardarRuta(e: EstadoRuta): Promise<void> {
  ruta = e;
  await guardarEstado(repo, e);
  await pintarRuta();
}

async function pintarRuta(): Promise<void> {
  const analisis = vistaHallazgos(await repo.listar(), hoy()).analisis;
  const v = vistaRuta(ruta, analisis, hoy(), await riesgoHoy());
  if (v.cambio !== 'sigue' || v.estadoRuta !== ruta) {
    ruta = v.estadoRuta;
    await guardarEstado(repo, ruta);
  }
  const cambio = $('ruta-cambio');
  cambio.hidden = v.cambio === 'sigue';
  cambio.textContent = MENSAJE_CAMBIO[v.cambio];

  $('ruta-riesgo').hidden = v.estado !== 'oculto_por_riesgo';
  $('ruta-vacia').hidden = v.estado !== 'sin_candidatos';
  $('ruta-paso').hidden = !v.sugerencia;
  pintarMetas();
  if (!v.sugerencia) return;

  const s = v.sugerencia;
  $('ruta-area').textContent = AREAS[s.habito.area]?.nombre ?? s.habito.area;
  $('ruta-habito').textContent = s.habito.descripcion;
  $('ruta-porque').textContent = s.porque;
  $('ruta-siguiente').textContent = s.siguiente ? `Después: ${s.siguiente.descripcion}` : 'Es el último paso de esta ruta.';
  const prog = $('ruta-progreso');
  prog.replaceChildren(
    ...Array.from({ length: v.pasoEnRuta?.total ?? 0 }, (_, i) => {
      const li = document.createElement('li');
      const n = i + 1;
      const actual = v.pasoEnRuta?.actual ?? 0;
      li.className = n < actual ? 'hecho' : n === actual ? 'actual' : '';
      li.setAttribute('aria-label', `Paso ${n}${n === actual ? ' (actual)' : n < actual ? ' (hecho)' : ''}`);
      return li;
    }),
  );
  $('ruta-propuesta').hidden = v.estado !== 'propuesta';
  $('ruta-activa').hidden = v.estado !== 'activa';
  $('ruta-dificil').hidden = v.estado !== 'activa';
  $('ruta-noaplica').hidden = false;
  $('ruta-si').setAttribute('aria-pressed', String(v.hechoHoy === true));
  $('ruta-no').setAttribute('aria-pressed', String(v.hechoHoy === false));
  const a = adherencia(ruta, hoy());
  const desde = ruta.activo?.desde;
  const dias = desde ? Object.entries(ruta.checks).filter(([f, h]) => h && f >= desde).length : 0;
  $('ruta-adherencia').textContent = ruta.activo
    ? a
      ? `Esta semana: ${a.hechos} de 7 días.`
      : dias === 0
        ? 'Empezaste este paso. A los 7 días vemos cómo va.'
        : `Llevas ${dias} ${dias === 1 ? 'día' : 'días'} cumplido${dias === 1 ? '' : 's'} en este paso. A los 7 días vemos cómo va.`
    : '';
  $('ruta-fuentes').replaceChildren(
    ...v.fuentes.map((f) => {
      const li = document.createElement('li');
      const enlace = document.createElement('a');
      enlace.href = f.url;
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
      enlace.textContent = f.cita;
      li.append(enlace);
      return li;
    }),
  );
  $('ruta-contra').textContent = s.habito.contraindicaciones.join(' ');
}

function pintarMetas(): void {
  $('metas').replaceChildren(
    ...Object.entries(AREAS).map(([id, a]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'boton';
      b.textContent = a.nombre;
      const elegida = ruta.metas.includes(id);
      b.setAttribute('aria-pressed', String(elegida));
      b.addEventListener('click', async () => {
        const metas = elegida ? ruta.metas.filter((m) => m !== id) : [...ruta.metas, id].slice(-MAX_METAS);
        await guardarRuta({ ...ruta, metas });
      });
      return b;
    }),
  );
}

$('ruta-intento').addEventListener('click', async () => {
  const analisis = vistaHallazgos(await repo.listar(), hoy()).analisis;
  const v = vistaRuta(ruta, analisis, hoy(), await riesgoHoy());
  if (v.sugerencia) await guardarRuta(aceptar(ruta, v.sugerencia, hoy()));
});
$('ruta-si').addEventListener('click', () => guardarRuta(marcarDia(ruta, hoy(), true)));
$('ruta-no').addEventListener('click', () => guardarRuta(marcarDia(ruta, hoy(), false)));
$('ruta-dificil').addEventListener('click', () => guardarRuta(muyDificil(ruta, hoy())));
$('ruta-noaplica').addEventListener('click', async () => {
  if (ruta.activo) {
    await guardarRuta(noAplica(ruta, hoy()));
    return;
  }
  // Propuesta sin aceptar: "no aplica" también saca esa área por 30 días.
  const analisis = vistaHallazgos(await repo.listar(), hoy()).analisis;
  const v = vistaRuta(ruta, analisis, hoy(), await riesgoHoy());
  if (v.sugerencia) await guardarRuta(noAplica(aceptar(ruta, v.sugerencia, hoy()), hoy()));
});

$('cargar-demo').addEventListener('click', async () => {
  const boton = $<HTMLButtonElement>('cargar-demo');
  boton.disabled = true;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}demo/persona-demo.json`);
    if (!r.ok) throw new Error(String(r.status));
    const demo = (await r.json()) as { dias: DiaDemo[] };
    const n = await cargarDemo(repo, demo.dias, new Date());
    $('estado-demo').textContent = `Listo: se cargaron ${n} días de una persona inventada. Mira "Lo que notamos".`;
    await pintarHistorial();
    await pintarHallazgos();
    await pintarRuta();
    activarPestana('notamos');
  } catch {
    $('estado-demo').textContent = 'No pude cargar los datos de ejemplo. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    boton.disabled = false;
  }
});

async function iniciar(): Promise<void> {
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  $('fecha').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  try {
    repo = await RepositorioIndexedDB.abrir();
  } catch {
    repo = new RepositorioMemoria();
    usandoMemoria = true;
  }
  cargarEnFormulario(await repo.obtener(hoy()));
  ruta = await leerEstado(repo);
  await pintarHistorial();
  await pintarHallazgos();
  await pintarRuta();
  let inicial: Pestana = 'hoy';
  try {
    const guardada = sessionStorage.getItem('tabien:pestana');
    if (guardada && (PESTANAS as readonly string[]).includes(guardada)) inicial = guardada as Pestana;
  } catch {
    /* sin almacenamiento de sesión */
  }
  activarPestana(inicial);
  if (import.meta.env.MODE === 'lt') {
    $('aviso-lt').hidden = false;
    await import('./lt-modelo');
  }
}

void iniciar();
