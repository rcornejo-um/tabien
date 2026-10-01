# Contrato del pipeline de texto — `texto-v1`

Este documento es **la** definición del pipeline. Python (`ml/src/texto/`) y TypeScript (`app/src/ml/texto/`) lo implementan por separado y **ambos** deben pasar los fixtures de `spec/fixtures/`. Si una implementación y este documento discrepan, manda este documento; si este documento es ambiguo, se corrige aquí primero y se sube la versión.

- `pipeline_version`: **`texto-v1`**
- Todo modelo exportado graba su `pipeline_version`. El runtime **rechaza** un modelo con otra versión.

## Reglas generales

1. **Alfabeto explícito.** Ninguna regex usa `\w`, `\d`, `\s` ni `\b`: en Python son Unicode y en JavaScript son ASCII, y esa diferencia rompe la paridad en silencio. Se usan clases explícitas (`[a-z0-9ñ_]`, `[0-9]`, etc.).
2. **Se opera por punto de código** (no por unidad UTF-16). En TS se recorre con `for…of`.
3. **Sin recorte.** El pipeline no trunca notas ni secuencias. Un modelo de "bolsa" de features no necesita largo fijo.
4. **Sin reemplazo de chilenismos ni stopwords.** "pega", "po", "cachai", "la raja" y "no" se conservan tal cual (ver `decisions/002`).

## Paso 0 — Riesgo (fuera de `texto-v1`)

La capa de riesgo corre **antes** de este pipeline, sobre el texto original. Se especifica e implementa en F1 (`docs/seguridad.md`). Este contrato empieza en el paso 1.

## Paso 1 — Anonimizar

Se aplica **sobre el texto original** (antes de normalizar, porque después se pierde el formato de RUT y teléfonos). Tres reemplazos, **en este orden**, cada uno global (no superpuesto, de izquierda a derecha):

| Orden | Entidad | Regex | Reemplazo |
|---|---|---|---|
| 1 | Correo | `[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+` | `<email>` |
| 2 | RUT | `(?<![A-Za-z0-9_.])[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK](?![A-Za-z0-9_])` | `<rut>` |
| 3 | Teléfono (móvil `9` o fijo `2`, con o sin `+56`) | `(?<![A-Za-z0-9_+])(?:\+?56[ .-]?)?[29][ .-]?[0-9]{4}[ .-]?[0-9]{4}(?![A-Za-z0-9_])` | `<telefono>` |

Notas:
- El RUT exige guion y dígito verificador. Así "12345678" (pasos) no se confunde con un RUT.
- El teléfono exige 9 dígitos que empiecen en 9 o 2. Así "10000 pasos" o "2026" no se tocan.
- **Limitación conocida:** nombres propios ("la Cata") **no** se anonimizan en v1 (F2). Teléfonos con formatos raros: `parking_lot.md` #4.

## Paso 2 — Normalizar

En este orden:

| # | Operación | Detalle |
|---|---|---|
| N1 | Normalización Unicode **NFKC** | Une tildes compuestas y convierte formas "de compatibilidad" (`ＨＯＬＡ` → `HOLA`, `²` → `2`) |
| N2 | Minúsculas | `str.lower()` / `String.prototype.toLowerCase()` |
| N3 | Recorrido por punto de código `c` | ver tabla N3 |
| N4 | Letras alargadas | `([a-zñ])\1{2,}` → `\1` (3 o más iguales → una). **Solo letras**: los dígitos no se tocan (`10000` sigue siendo `10000`) |
| N5 | Separar número y unidad | `([0-9])([a-zñ])` → `\1 \2` (`30min` → `30 min`) |
| N6 | Todo lo que no sea `[a-z0-9ñ_<> ]` → espacio | Puntuación, tabs, saltos de línea, letras de otros alfabetos |
| N7 | Espacios | ` +` → un espacio; quitar espacios al inicio y al final |

**Tabla N3** (se evalúa en este orden para cada punto de código `c`):

1. Si `c` está en **SE_ELIMINA** → se borra.
2. Si `c` está en **EMOJI_A_TOKEN** → se reemplaza por ` <token> ` (con espacios a ambos lados).
3. Si `c` está en algún **RANGO_EMOJI** → ` <emo_otro> `.
4. Si `c` es `ñ` → se conserva.
5. Si no → se descompone en NFD y se eliminan los puntos de código U+0300–U+036F (tildes, diéresis, etc.).

**SE_ELIMINA:** U+FE0E, U+FE0F (selectores de variante), U+200D (unión de ancho cero), U+20E3 (tecla), U+1F3FB–U+1F3FF (tonos de piel), U+2640, U+2642 (signos de género). Así `🏃‍♂️` queda solo como `🏃`.

**RANGO_EMOJI:** U+2600–U+27BF, U+2B50–U+2B55, U+1F000–U+1FAFF.

**EMOJI_A_TOKEN:**

| Token | Emojis |
|---|---|
| `<emo_sueno>` | 😴 🥱 💤 🛌 |
| `<emo_estres>` | 😩 😰 😫 😤 😓 🤯 😖 😵 |
| `<emo_comida>` | 🍔 🥗 🍕 🍎 🍌 🍞 🍜 🍟 🥑 |
| `<emo_cafe>` | ☕ |
| `<emo_ejercicio>` | 💪 🏃 🚴 🏋 🧘 ⚽ |
| `<emo_feliz>` | 😊 😄 😁 🙂 😀 🥰 😍 🎉 ✨ 😎 |
| `<emo_triste>` | 😢 😭 😞 😔 ☹ 🥺 💔 |
| `<emo_enojo>` | 😡 😠 🤬 |
| `<emo_risa>` | 😂 🤣 |
| `<emo_amor>` | ❤ 💕 🤗 |
| `<emo_pantalla>` | 📱 💻 📺 🎮 |
| `<emo_agua>` | 💧 🚰 🥤 |
| `<emo_estudio>` | 📚 📝 ✏ 🎓 💼 |

La tabla canónica, con los puntos de código, está en `spec/emojis.json` y ambas implementaciones la leen desde ahí (TS la importa en build; Python la lee del archivo).

> Los números con decimales quedan separados (`7.5` → `7 5`). T3 extrae cantidades del texto anonimizado **sin normalizar**, así que esto no lo afecta (`parking_lot.md` #2).

## Paso 3 — Tokenizar

**3a. Palabras:** todas las coincidencias, en orden, de

```
<[a-z0-9ñ_]+>|[a-z0-9ñ_]+
```

Una etiqueta (`<emo_sueno>`, `<email>`) es **un solo token**. Un `<` o `>` suelto se ignora.

**3b. Features** (en este orden, palabra por palabra):

1. `"w:" + palabra` para **toda** palabra (también las etiquetas).
2. Si la palabra **no** empieza con `<`: se arma `"^" + palabra + "$"` y se emiten sus n-gramas de caracteres para `n = 2, 3, 4, 5` (primero todos los de `n = 2` de izquierda a derecha, luego `n = 3`, etc.), cada uno como `"c:" + ngrama`. Si la palabra marcada tiene menos de `n` caracteres, no hay n-gramas de ese largo.

Ejemplo, `sol` → `^sol$`:
`w:sol`, `c:^s`, `c:so`, `c:ol`, `c:l$`, `c:^so`, `c:sol`, `c:ol$`, `c:^sol`, `c:sol$`, `c:^sol$`.

> El alfabeto base es explícito (`a–z`, `0–9`, `ñ`, `_`, `^`, `$`): no hay "letras desconocidas" como la `k` del prototipo con BPE. Cualquier palabra nunca vista se representa con sus n-gramas.

**3c. Hashing:**

```
cubeta = fnv1a32(utf8(feature)) mod 2^B
```

FNV-1a de 32 bits: `h = 0x811C9DC5`; por cada byte `b`: `h = h XOR b`; `h = (h × 0x01000193) mod 2^32`. `B` (bits de cubeta) lo fija cada modelo en su `manifest.json`.

Vectores oficiales de prueba: `fnv1a32("") = 0x811C9DC5`, `fnv1a32("a") = 0xE40C292C`, `fnv1a32("foobar") = 0xBF9CF968`.

## Paso 4 — Vector (modelos `tabien-lineal-v1`)

1. `tf[cubeta]` = cuántas features cayeron en esa cubeta.
2. `x[cubeta] = tf[cubeta] × idf[cubeta]` (el `idf` viene en los pesos).
3. Normalización L2: `x = x / ‖x‖₂` (si `‖x‖₂ = 0`, `x` queda en cero).

## Casos borde (cubiertos por fixtures)

Texto vacío; solo espacios; solo emoji; emoji con selector de variante, tono de piel o unión de ancho cero; emoji fuera de la tabla; mayúsculas de ancho completo; `ñ` y `Ñ`; diéresis; letras alargadas junto a dígitos largos; `<` y `>` sueltos; datos personales pegados a puntuación.

## Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| `texto-v1` | 2026-09-30 | Primera versión. Corrige el prototipo de Colab (ver `decisions/002`) |
