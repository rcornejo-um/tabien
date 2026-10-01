# 005 — Prueba de la guía de etiquetado con 100 notas

**Fecha:** 2026-09-30 · **Fase:** F1 · **Estado: Parcial**

## Hipótesis

La guía de etiquetado v1 permite etiquetar notas variadas con acuerdo suficiente (kappa ≥ 0,6 por etiqueta y para el tono), y la prueba revela qué definiciones son ambiguas.

## Método

- **Muestra:** 100 notas de `sintetico-v2` (semilla 21, distinta de la de entrenamiento), con sobremuestreo de casos difíciles: 18 cortas, 18 multitema, 8 sin tema, 18 con mucho chilenismo, 12 sin tildes y 26 al azar (`ml/etiquetado/muestra.py`).
- **Anotadores.** El criterio original pide dos **personas**. No las hay todavía, así que:
  - A = la verdad que plantó el generador;
  - B = Claude, etiquetando **a ciegas** (solo con `muestra_100.jsonl`, sin ver la verdad) y aplicando la guía al pie de la letra.
- **Acuerdo:** `ml/src/evaluacion/acuerdo.py` (kappa de Cohen por etiqueta; kappa ponderado cuadrático para el tono). Resultado congelado en `ml/etiquetado/acuerdo_muestra_100.json`.

## Resultado

| Etiqueta | kappa | Etiqueta | kappa |
|---|---|---|---|
| sueno | 1,00 | social | 0,97 |
| estres | 0,85 | estudio_trabajo | 1,00 |
| alimentacion | 1,00 | pantallas | 1,00 |
| ejercicio | 1,00 | hidratacion | 1,00 |
| animo | 0,91 | descanso | 0,85 |
| **tono** | **0,58** (acuerdo exacto 45%, MAE 0,64) | | |

**Desacuerdos de tema (10 en total, todos explicables):**
- **Calma** ("día tranqui", "todo piola", "me sentí relajado"): el generador puso `estres` y la guía llevó a `animo`. Las 3 notas las había marcado *ambiguas* a ciegas, así que la marca funcionó.
- **"Descansé harto anoche"** (×2) y **siesta**: el generador agregaba `descanso` y la guía no.
- **Pichanga**: el generador agrega `social` y la guía no lo decía.

## Por qué el estado es Parcial y no Aprobado

1. **El kappa de temas está inflado y no valida la guía para notas reales.** La misma persona técnica (Claude) escribió el generador, su banco de frases y la guía, y las notas salen de un vocabulario cerrado. Un kappa de 0,85–1,00 aquí solo dice que la guía es coherente con el generador.
2. **El tono no pasa: 0,58 < 0,6.** Casi todos los desacuerdos son de un punto (0 contra ±1). Hay dos causas mezcladas que esta prueba no puede separar: (a) el tono del generador sale del estado latente y no siempre está en el texto; (b) la frontera entre 0 y ±1 es subjetiva.
3. No hubo dos personas, que es lo que pide el criterio de F1.

## Cambios aplicados (guía v1.1)

Calma → `estres`; siesta → `sueno` + `descanso`; "descansé anoche" → solo `sueno`; pichanga → también `social`; reglas para palabras valorativas en el tono y "si dudas entre 0 y ±1, elige 0". El generador pasó a v2.1 con las mismas reglas. **La guía v1.1 no está validada**: alinear el generador con la guía no es evidencia.

## Qué falta para Aprobado

Dos personas etiquetan las mismas 100 notas (o, mejor, 100 notas reales del inicio del piloto) con la guía v1.1, sin ver lo que puso la otra. Criterio: kappa ≥ 0,6 en las 10 etiquetas y en el tono. Si el tono sigue bajo, la propuesta es pasar a **3 niveles** (negativo / neutro / positivo) y medir de nuevo.
