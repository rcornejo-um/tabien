# Especificación de ML — documento vivo

Este documento resume la §6 del prompt maestro y registra **qué cambió y por qué**. El contrato de texto está en `spec/texto.md`; las decisiones con números, en `decisions/`.

## Tareas

| ID | Tarea | Tipo | Versión actual | Fase |
|---|---|---|---|---|
| T1 | Temas de la nota | Multietiqueta (10 etiquetas) | M1 de mecánica (`v000`, no publicable) | F0 → F2 |
| T2 | Tono (−2 a +2) | Ordinal | — | F2 |
| T3 | Cantidades | Extracción por reglas | — | F2 |
| T4 | Anonimización | Regex (email, teléfono, RUT) | `texto-v1` | F0; nombres en F2 |
| T5 | Patrones por persona | Estadística explicable | `patrones-v1` (Python + TS con paridad; `decisions/007`) | F3 |
| T6 | Rutas de hábitos | Reglas → bandit | — | F4 |
| T7 | Riesgo | Solo reglas curadas | `riesgo-v1-prototipo` (sin revisión clínica) | F1 |

**Taxonomía T1 (inicial):** `sueno`, `estres`, `alimentacion`, `ejercicio`, `animo`, `social`, `estudio_trabajo`, `pantallas`, `hidratacion`, `descanso`. Cero o varias por nota.

## Capas de datos

| Capa | Uso permitido | Uso prohibido |
|---|---|---|
| D0 sintético | Probar pipeline, mecánica, motor de patrones, simulador de rutas | Reportar desempeño de comprensión como real |
| D1 piloto | Entrenar y evaluar T1–T3 (fuente de verdad) | Sin consentimiento o con menores de 18 |
| D2 correcciones | Umbrales locales; reentrenamiento global solo con opt-in | Salir del dispositivo sin consentimiento |

> `ml/data/sintetico_v0.py` (F0) es solo para mecánica. `ml/data/sintetico.py` (`sintetico-v2.1`, F1) tiene estado latente y efectos plantados (`decisions/004`). **D0 no sirve para T2**: el tono no siempre está en el texto (`decisions/005`).

## Escalera de modelos (T1, T2)

| Peldaño | Modelo | Estado |
|---|---|---|
| M0 | Palabras clave | F2 |
| M1 | TF-IDF hasheado (palabras + n-gramas de caracteres 2–5) + regresión logística uno-contra-todos | Mecánica validada en F0 (ver `decisions/003`); `v000` = 14 bits, int8, **no publicable** |
| M2 | Embedding-bag con hashing (estilo fastText) | F2 |
| M3 | BETO ajustado, solo taller | F2 |

### Formato del modelo lineal (`tabien-lineal-v1`)

- `features = hash_fnv1a32(feature) mod 2^B`, con `feature` = `"w:" + palabra` o `"c:" + n-grama` (ver `spec/texto.md`).
- Vector: frecuencias por cubeta × `idf[cubeta]`, luego normalización L2.
- `p_k = sigmoide(Σ_j x_j · W[j, k] + b_k)`.
- `weights.bin`: `idf` (float32, `2^B`) · `W` (`2^B × K`, por cubeta y luego etiqueta, en `float32`, `float16` o `int8` con escala por etiqueta) · `b` (float32, `K`). Little-endian. Offsets, escalas y sha256 en `manifest.json`.
- La referencia de Python **usa los mismos pesos exportados** (ya descuantizados) para generar el conjunto de paridad.

## Protocolo de evaluación (desde F2)

División por persona (GroupKFold), retención temporal, bóveda congelada con hash registrado, IC 95% por bootstrap, análisis por segmentos y las 30 peores predicciones. Detalle en la §6.5 del prompt maestro.
