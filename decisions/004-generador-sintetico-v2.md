# 004 — Generador sintético v2: estado latente y efectos plantados

**Fecha:** 2026-09-30 · **Fase:** F1 · **Estado:** Aprobado (para su uso permitido)

## Hipótesis

Un generador con estado latente diario (estrés AR(1) y semanas de pruebas), variables que dependen de ese estado y efectos de magnitud conocida produce datos en los que: (a) los efectos plantados se pueden recuperar con una correlación simple, de forma monótona con la magnitud; (b) un par sin relación queda cerca de cero; (c) las notas son multietiqueta y coherentes con el día. En el prototipo de Colab, en cambio, los números eran aleatorios e independientes del texto.

## Método

`ml/data/sintetico.py` (detalle del modelo en su docstring). Tres efectos por persona, cada uno con magnitud en {0, moderada, fuerte}: E1 estrés → sueño (t+1), E2 ejercicio → tono (t) y E3 pantallas → sueño (t+1). Tests en `ml/tests/test_sintetico.py`: reproducibilidad, taxonomía, cantidades que aparecen en el texto y recuperación de cada efecto (Spearman por persona, promedio por grupo de magnitud).

## Resultado (`d0_v2`: 40 personas × 60 días)

| Efecto | ρ medio con magnitud 0 / moderada / fuerte |
|---|---|
| E1 estrés → sueño(t+1) | −0,04 / −0,49 / −0,75 |
| E2 ejercicio → tono | **+0,13** / +0,38 / +0,50 |
| E3 pantallas → sueño(t+1) | **−0,10** / −0,29 / −0,50 |
| Control agua → sueño(t+1) | +0,02 |

Los 7 tests pasan: (a), (b) y (c) se cumplen.

## Aprendizaje

- **Confusión plantada sin querer, y es útil.** Con magnitud 0, E2 y E3 igual muestran ρ ≠ 0, porque el estrés mueve las dos variables de cada par. Pasa lo mismo con datos reales. **Decisión que se arrastra a F3:** antes de medir la tasa de falsos descubrimientos del motor de patrones, hay que fijar si una asociación indirecta pero real cuenta como acierto o como error. Propuesta: la verdad de fondo de F3 se calcula **desde el modelo generativo completo** (qué pares están asociados, directa o indirectamente), no solo desde los efectos plantados.
- El tono sale del estado latente, no del texto, y la nota no siempre lo refleja (ver `decisions/005`).
- El generador quedó en v2.1 para alinear sus etiquetas con la guía v1.1. Solo cambian etiquetas; los números y los textos son idénticos.

## Límites

Vocabulario cerrado (~150 frases), estilo con pocas perillas, sin ironía, sin notas largas, sin riesgo. Ver `docs/data-card.md`. **Uso prohibido:** medir comprensión de texto.
