# Contrato de la capa de riesgo — `riesgo-v1-prototipo`

> ⚠️ **Prototipo sin revisión clínica.** Este léxico lo armó el equipo técnico. No se usa con personas reales hasta que una persona con formación en salud mental lo revise, lo corrija y lo apruebe. Ver `docs/seguridad.md`.

La capa de riesgo corre **siempre primero**, sobre el texto **original** (antes de anonimizar y antes del pipeline `texto-v1`), en el dispositivo. Son solo reglas, sin ML. **La falla aceptable es la falsa alarma, no el silencio.**

Python (`ml/src/riesgo/`) y TS (`app/src/ml/riesgo/`) leen el mismo léxico (`spec/riesgo/lexico-v1.json`) y pasan los mismos fixtures (`spec/fixtures/riesgo.json`).

## 1. Preparación del texto (propia de esta capa)

Es independiente de `texto-v1`, para que un cambio en el pipeline del modelo no pueda apagar la capa de riesgo.

1. NFKC y minúsculas.
2. Por punto de código: se conserva la `ñ`; el resto se descompone en NFD y se quitan U+0300–U+036F.
3. Letras repetidas 3 o más veces → una (`([a-zñ])\1{2,}` → `\1`): `moriiir` → `morir`.
4. Todo lo que no sea `[a-z0-9ñ]` → espacio. Los espacios repetidos quedan en uno y se recortan los bordes.

## 2. Excepciones

Antes de evaluar las reglas, cada coincidencia de una **excepción** se reemplaza por un espacio. Las excepciones existen solo para modismos muy frecuentes y claramente inofensivos ("me muero de sueño", "me quiero morir de vergüenza", "me pegó un resfrío"). Cada excepción nueva **reduce** la sensibilidad, así que necesita su justificación en el léxico.

Ojo: "de pena" **no** es excepción ("me quiero morir de pena" se activa).

## 3. Reglas

Cada regla tiene `id`, `categoria` (`suicidio_autolesion`, `violencia`, `crisis`) y `patron`. Se evalúa con frontera de palabra explícita:

```
(?<![a-z0-9ñ])(?:PATRON)(?![a-z0-9ñ])
```

## 4. Resultado

```
{ activado: boolean, categorias: string[] (orden del léxico, sin repetir), reglas: string[] (ids) }
```

Si `activado` es verdadero, la app (`docs/seguridad.md`):
- muestra recursos de ayuda con un lenguaje cálido;
- ese día **no** propone hábitos, rutas ni rachas;
- no gamifica ni puntúa ese contenido;
- en una exportación del piloto, el texto de ese día **no se exporta** (se reemplaza por una marca).

## 5. Falsas alarmas aceptadas (a propósito)

| Texto | Por qué se activa igual |
|---|---|
| "me voy a matar estudiando" | Modismo común, pero no se puede distinguir con reglas de una frase real. Se prefiere la falsa alarma |
| "quiero dormir para siempre" (después de las pruebas) | Ídem |
| "no quiero morir" | La negación no se interpreta: mencionar morir en primera persona merece atención |
| "me pegó mi hermano jugando" | Violencia física mencionada: se muestra el recurso y la persona decide |

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| `riesgo-v1-prototipo` | 2026-09-30 | Primera versión, sin revisión clínica |
