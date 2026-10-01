# Data card — conjuntos de datos de Tabien

## D0 · Sintético v2.1 (`ml/data/sintetico.py`)

| Campo | Valor |
|---|---|
| Origen | 100% sintético, con código y semilla fija. No contiene datos de ninguna persona |
| Versión | `sintetico-v2.1` (manifiesto con sha256: `ml/data/manifiestos/d0_v2.json`) |
| Conjuntos | `d0_v2`: 40 personas × 60 días (semilla 11), 1.937 notas · `d0_v2_largo`: 30 personas × 120 días (semilla 12), 2.724 notas |
| Por día | Fecha, día de la semana, sueño, pasos, agua (verdaderos y "ingresados", con huecos), tono (−2…+2), nota opcional, etiquetas, cantidades mencionadas y estado latente (`verdad_*`) |
| Verdad de fondo | `*_efectos.json`: magnitud de cada efecto plantado por persona y estilo de escritura |
| **Uso permitido** | Probar el pipeline, el **motor de patrones** (F3) y el **simulador de rutas** (F4) |
| **Uso prohibido** | Reportar desempeño de comprensión de texto (T1/T2/T3) como si fuera real |

### Distribución (`d0_v2`)

- Etiquetas por nota: 0 → 6%, 1 → 41%, 2 → 31%, 3 → 17%, 4 o más → 6%.
- Frecuencia por etiqueta (% de notas): `estudio_trabajo` 25, `social` 25, `alimentacion` 23, `animo` 22, `sueno` 21, `ejercicio` 21, `estres` 18, `pantallas` 11, `descanso` 7, `hidratacion` 4 (la más escasa).
- Tono (todos los días): −2 → 8%, −1 → 26%, 0 → 39%, +1 → 22%, +2 → 5%.
- Días con números ingresados: ~62%. Notas que mencionan una cantidad: ~9%.

### Efectos plantados y recuperación (correlación de Spearman media por persona, `d0_v2`)

| Efecto | Magnitud plantada → ρ medio observado |
|---|---|
| E1 estrés(t) → sueño(t+1) | 0 → −0,04 · −0,5 → −0,49 · −1,0 → −0,75 |
| E2 ejercicio(t) → tono(t) | 0 → **+0,13** · +0,5 → +0,38 · +1,0 → +0,50 |
| E3 pantallas(t) → sueño(t+1) | 0 → **−0,10** · −0,5 → −0,29 · −1,0 → −0,50 |
| Control: agua(t) → sueño(t+1) | sin efecto → +0,02 |

**Ojo (importante para F3):** con efecto plantado = 0, E2 y E3 igual muestran correlación. Es **confusión por el estrés**: el estrés baja el ejercicio y baja el tono, y sube las pantallas y baja el sueño. Esas asociaciones son *reales* en los datos, aunque no sean directas. Como los hallazgos de Tabien no son causales ("cuando pasa X, suele pasar Y"), en F3 hay que decidir **antes de medir** si una asociación indirecta cuenta como acierto o como falso descubrimiento.

### Sesgos y limitaciones conocidas

- **Vocabulario cerrado:** ~150 frases base. Un modelo de texto entrenado con esto alcanza un F1 de ~0,99 que no significa nada.
- **El tono no siempre está en el texto:** sale del estado latente, y la nota a veces no lo refleja. Una persona que etiquetó a ciegas coincidió con el generador solo en el 45% de los tonos (`decisions/005`). **D0 no sirve ni para la mecánica de T2.**
- Sin notas solo de emoji, sin notas largas, sin errores de autocorrector, sin ironía, sin contenido de riesgo.
- El estilo de escritura se varía con unas pocas perillas (tildes, emojis, chilenismos, typos), no como personas reales.

## D1 · Diario piloto

**Todavía no existe.** Protocolo: `docs/protocolo-piloto.md`. Cuando haya datos, esta sección registra el número de participantes y notas, la distribución por etiqueta y por persona, el acuerdo entre anotadores (kappa por etiqueta), los nombres propios encontrados en la revisión manual, los participantes en la bóveda (con hash) y los sesgos conocidos (quiénes se ofrecieron y quiénes no).

## D2 · Correcciones en la app

Desde F6. Solo con opt-in.
