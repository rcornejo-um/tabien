# 002 — Contrato del pipeline de texto `texto-v1`

**Fecha:** 2026-09-30 · **Fase:** F0 · **Estado:** Aprobado

## Hipótesis

Un pipeline de texto especificado por escrito, con alfabeto explícito y fixtures escritos a mano, se puede implementar dos veces (Python y TS) con resultados **idénticos**, y corrige los errores del prototipo de Colab (`docs/habitos_tokenizacion.ipynb`).

## Método

1. Se leyó el notebook completo y se listaron sus decisiones de texto.
2. Se escribió `spec/texto.md` y la tabla `spec/emojis.json`.
3. Se escribieron **a mano** los resultados esperados en `spec/fixtures/{anonimizar,normalizar,tokenizar}.json`, sin derivarlos de ninguna implementación. El hash se valida contra los vectores oficiales de FNV-1a, más casos UTF-8 calculados con `str.encode` en Python (un camino distinto al codificador en línea de TS).
4. Se implementó dos veces: `ml/src/texto/` y `app/src/ml/texto/`. Ambas suites leen los mismos JSON.
5. TS además verifica que el camino rápido de inferencia (`hashearCubetas`, que no arma strings) dé exactamente las mismas cubetas que el camino legible, con 12, 14, 16 y 18 bits.

## Resultado

| Suite | Casos | Pasan |
|---|---|---|
| pytest (Python 3.12.13) | 72 | **72** |
| vitest (Node 24.11.1) | 81 (incluye la equivalencia de los dos caminos de hashing) | **81** |

Ambas pasaron al primer intento, sin ajustar fixtures después de ver una implementación.

## Cambios respecto del prototipo (y por qué)

| Prototipo | `texto-v1` | Por qué |
|---|---|---|
| Diccionario de chilenismos (`pega` → `trabajo`, `harta` → `mucha`, `po`/`cachai`/`jaja` borrados) | **Se conservan tal cual** | Producía errores ("mucha trabajo") y perdía matiz; "la raja" quedaba fuera. Los n-gramas de caracteres y los datos reales hacen el trabajo |
| Stopwords con lista propia | **No se quitan** | Las negaciones son críticas ("no dormí bien"). Si quitar stopwords ayuda, se mide en F2 (`parking_lot.md` #3). Un test verifica que `no`, `nunca`, `cero`, `nada` y `sin` sobreviven |
| Recorte a percentil 95 (14 tokens BPE cortaron "ando cansado") | **Sin recorte** | Un modelo de bolsa de features no necesita largo fijo |
| BPE entrenado con el corpus (no conocía la "k") | **Alfabeto base explícito** + n-gramas de caracteres 2–5 con hashing | Ninguna letra del alfabeto queda fuera por azar del corpus; las palabras nunca vistas se representan por sus pedazos |
| `(\w)\1{2,}` para letras alargadas | `([a-zñ])\1{2,}` | **Bug nuevo encontrado:** `\w` incluye dígitos, así que "10000 pasos" quedaba "10 pasos". Fixture `digitos-no-se-colapsan` |
| `\w`, `\d`, `\b` en las regex | Clases explícitas ASCII | `\w` es Unicode en Python y ASCII en JS: la paridad se rompería en silencio |
| Emojis fuera de la tabla se borraban; `☕️` (con selector de variante) no calzaba | Selectores, tonos de piel y uniones se eliminan; los desconocidos pasan a `<emo_otro>` | No perder señal y ser consistentes |
| NFC implícito | **NFKC** | Une formas de compatibilidad (`ＨＯＬＡ`, `m²`) |
| Teléfono solo móvil | Móvil (9) y fijo (2), con o sin `+56` | Cobertura. Formatos raros: `parking_lot.md` #4 |

## Aprendizaje

- Escribir el contrato **antes** que el código obligó a decidir casos borde que en el notebook quedaban al azar (por ejemplo, qué hace `<` suelto o un emoji con tono de piel).
- El camino rápido de hashing evita crear un string por cada n-grama, pero solo es seguro porque un test lo compara contra el camino legible.

## Riesgos que quedan

- **Versiones de Unicode:** NFKC y `lower()` dependen de la versión de Unicode de cada runtime (Python 3.12 trae Unicode 15.0; Node 24 trae una más nueva vía ICU). Las diferencias solo afectan caracteres agregados recientemente, y el paso N6 descarta casi todo lo que no es `[a-z0-9ñ]`. Se acepta y se documenta.
- Los fixtures cubren los casos que se nos ocurrieron. Las notas reales del piloto (F1) traerán casos nuevos: cada uno que falle se agrega como fixture.
