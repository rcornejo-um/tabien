# Tabien

Prototipo **local-first** que entiende lo que una persona cuenta de su día ("dormí pésimo, harta pega 😩") y le muestra patrones en lenguaje simple. Proyecto Dicarch. Todo corre en el dispositivo: nada sale sin consentimiento explícito.

> ⚠️ **Prototipo.** La capa de riesgo no tiene revisión clínica y no se debe usar con personas reales todavía (ver `docs/seguridad.md` y `docs/protocolo-piloto.md`).

## Probar la app

Requisitos: Node 22 o superior.

```sh
npm install
npm run dev
```

Abre la URL que aparece (también funciona desde el teléfono, en la misma red). Luego:

1. Escribe una nota en **Hoy** y, si quieres, horas de sueño, pasos y agua. Pulsa **Guardar**.
2. Para ver **Lo que notamos** sin esperar 14 días: **Mis datos → Cargar datos de ejemplo** (60 días de una persona inventada).
3. En **Ruta**, elige una meta o acepta el paso que te proponemos según lo que notamos. Marca cada día si lo hiciste: a los 7 días la ruta avanza o se hace más fácil.
4. **Mis datos → Borrar todo** deja el dispositivo limpio.

Los temas de las notas se detectan con palabras clave (M0). No hay modelo de ML entrenado con datos reales todavía.

## Desarrollo

```sh
npm test            # vitest: contratos, paridad Python↔TS, núcleo
npm run typecheck   # incluye el chequeo de que el núcleo no toca el DOM
npm run e2e         # pantalla Hoy en Chromium real (usa Brave: CHROME_PATH para otro)

cd ml && uv run pytest   # taller de ML en Python 3.12
```

## Dónde está cada cosa

- `CLAUDE.md`: resumen vinculante del proyecto.
- `decisions/`: cada decisión con su hipótesis, método, resultado y estado.
- `spec/`: contratos compartidos por Python y TS (texto, riesgo, patrones) y sus fixtures.
- `docs/`: visión, privacidad, seguridad, guía de etiquetado, protocolo del piloto y data card.
- `app/`: la app (TypeScript). `ml/`: taller de ML (Python). `bench/`: mediciones en el perfil de referencia.
