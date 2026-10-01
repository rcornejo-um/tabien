// Prueba de punta a punta de la pantalla Hoy en Chromium real (sin dependencias).
// Uso: npm run build && node app/e2e/hoy.mjs

import { fileURLToPath } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { evaluar, lanzarNavegador, nuevaPagina, servir } from '../../bench/cdp.mjs';

const DIST = fileURLToPath(new URL('../../dist/app/', import.meta.url));
const servidor = await servir(DIST);
const { cdp, cerrar } = await lanzarNavegador();
const { sessionId } = await nuevaPagina(cdp);
const ev = (js) => evaluar(cdp, sessionId, js);
let fallas = 0;

function verificar(nombre, ok, detalle = '') {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${ok ? '' : `  → ${detalle}`}`);
  if (!ok) fallas++;
}

async function navegar() {
  await cdp.enviar('Page.navigate', { url: servidor.url }, sessionId);
  for (let i = 0; i < 40; i++) {
    await esperar(100);
    if (await ev(`document.readyState === 'complete' && document.getElementById('historial').children.length > 0`)) return;
  }
  throw new Error('La página no terminó de cargar');
}

async function escribirYGuardar(campos) {
  await ev(`(() => {
    const c = ${JSON.stringify(campos)};
    for (const [id, v] of Object.entries(c)) document.getElementById(id).value = v;
    document.querySelector('#form-dia button[type=submit]').click();
  })()`);
  await esperar(300);
}

try {
  await navegar();
  verificar('sin datos muestra historial vacío', await ev(`document.getElementById('historial').textContent.includes('Todavía no hay')`));

  await escribirYGuardar({ nota: '', sueno: '', pasos: '', agua: '' });
  verificar('día vacío muestra un error que guía',
    (await ev(`document.getElementById('error-texto').textContent`)).includes('escribe una nota'));

  await escribirYGuardar({ nota: '', sueno: '30', pasos: '', agua: '' });
  verificar('sueño fuera de rango marca el campo',
    await ev(`document.getElementById('sueno').getAttribute('aria-invalid') === 'true'`));

  await escribirYGuardar({ nota: 'dormí pésimo, harta pega 😩', sueno: '5,5', pasos: '4000', agua: '' });
  verificar('guarda una nota normal', (await ev(`document.getElementById('estado').textContent`)).includes('Guardado'));
  verificar('la ayuda NO aparece en una nota normal', await ev(`document.getElementById('ayuda').hidden`));

  await navegar();
  verificar('persiste en IndexedDB tras recargar',
    (await ev(`document.getElementById('nota').value`)) === 'dormí pésimo, harta pega 😩' &&
      (await ev(`document.getElementById('sueno').value`)) === '5,5');
  verificar('el historial muestra el día', (await ev(`document.getElementById('historial').textContent`)).includes('4.000 pasos'));

  await escribirYGuardar({ nota: 'ya no quiero vivir', sueno: '', pasos: '', agua: '' });
  verificar('nota de riesgo muestra la ayuda', await ev(`!document.getElementById('ayuda').hidden`));
  verificar('la ayuda recibe el foco', await ev(`document.activeElement?.id === 'ayuda'`));
  verificar('con riesgo no se dice "Guardado ✓"', !(await ev(`document.getElementById('estado').textContent`)).includes('✓'));

  verificar('exportar parte deshabilitado (consentimiento por acción)', await ev(`document.getElementById('exportar').disabled`));

  verificar('con riesgo hoy, "Lo que notamos" no muestra patrones',
    (await ev(`document.getElementById('hallazgos-estado').textContent`)).includes('Hoy no mostramos'));

  // Datos de ejemplo + costo del motor con CPU 4× (perfil web de referencia).
  await ev(`document.getElementById('ajustes').open = true`);
  await escribirYGuardar({ nota: 'día tranqui', sueno: '', pasos: '', agua: '' }); // hoy sin riesgo
  await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: 4 }, sessionId);
  await ev(`document.getElementById('cargar-demo').click()`);
  for (let i = 0; i < 60 && !(await ev(`document.getElementById('estado-demo').textContent`)); i++) await esperar(200);
  const nHallazgos = await ev(`document.querySelectorAll('#lista-hallazgos li').length`);
  verificar('los datos de ejemplo muestran hallazgos', nHallazgos >= 2, `hallazgos: ${nHallazgos}`);
  const textoH = await ev(`document.getElementById('lista-hallazgos').textContent`);
  verificar('las frases no son causales', !/\b(causa |provoca|debido|porque)/i.test(textoH.replace(/no una causa/g, '')));
  const ms = await ev(`window.__msHallazgos`);
  verificar(`motor de patrones con CPU 4×: ${ms.toFixed(1)} ms (≤ 100 ms)`, ms <= 100);
  await cdp.enviar('Emulation.setCPUThrottlingRate', { rate: 1 }, sessionId);
  verificar('al cargar la demo se abre la pestaña Notamos',
    await ev(`document.getElementById('tab-notamos').getAttribute('aria-selected') === 'true' && !document.getElementById('panel-notamos').hidden`));

  // Ruta: propuesta desde los hallazgos, "Lo intento", marcar el día y persistir.
  await ev(`document.getElementById('tab-ruta').click()`);
  verificar('la pestaña Ruta muestra una propuesta con su porqué',
    !(await ev(`document.getElementById('ruta-paso').hidden`)) &&
      (await ev(`document.getElementById('ruta-porque').textContent`)).startsWith('Porque notamos esto'));
  verificar('la propuesta muestra su fuente', (await ev(`document.querySelectorAll('#ruta-fuentes a').length`)) > 0);
  await ev(`document.getElementById('ruta-intento').click()`);
  await esperar(300);
  verificar('"Lo intento" activa el paso', !(await ev(`document.getElementById('ruta-activa').hidden`)));
  await ev(`document.getElementById('ruta-si').click()`);
  await esperar(300);
  verificar('marcar "Sí, lo hice" queda registrado', (await ev(`document.getElementById('ruta-si').getAttribute('aria-pressed')`)) === 'true');
  await navegar();
  verificar('la ruta y el día marcado persisten al recargar',
    (await ev(`document.getElementById('tab-ruta').getAttribute('aria-selected')`)) === 'true' &&
      (await ev(`document.getElementById('ruta-si').getAttribute('aria-pressed')`)) === 'true');

  await ev(`document.getElementById('ajustes').open = true; document.getElementById('borrar').click()`);
  verificar('borrar pide confirmación', await ev(`!document.getElementById('confirmar-borrado').hidden`));
  await ev(`document.getElementById('borrar-si').click()`);
  await esperar(300);
  await navegar();
  verificar('borrar todo deja el dispositivo vacío',
    (await ev(`document.getElementById('nota').value`)) === '' &&
      (await ev(`document.getElementById('historial').textContent.includes('Todavía no hay')`)));
} finally {
  await cerrar();
  servidor.cerrar();
}
console.log(fallas === 0 ? '\nE2E Hoy: todo OK' : `\nE2E Hoy: ${fallas} fallas`);
process.exit(fallas === 0 ? 0 : 1);
