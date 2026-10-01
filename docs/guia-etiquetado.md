# Guía de etiquetado — v1.1

Para quien etiqueta notas de Tabien. Cada nota recibe **cero o varias etiquetas de tema** (T1) y **un tono** (T2). Con la herramienta `ml/etiquetado/index.html` toma de 10 a 20 segundos por nota.

## Reglas generales

1. **Etiqueta lo que la nota dice, no lo que adivinas.** "Estudié toda la tarde" es `estudio_trabajo`; no le pongas `estres` si no hay señal de estrés.
2. **Una mención basta.** El tema no tiene que ser el principal: "dormí bien, harta pega" lleva `sueno` **y** `estudio_trabajo`.
3. **Lo positivo y lo negativo valen igual.** "Dormí bacán" y "dormí pésimo" son ambas `sueno`. La dirección va en el tono.
4. **Las negaciones cuentan.** "Cero ejercicio" es `ejercicio` (habla de ejercicio, aunque no lo hizo).
5. **Los emojis cuentan como palabras.** Una nota que es solo "😴" lleva `sueno`. "🍔" solo lleva `alimentacion`.
6. **Si dudas entre etiquetar o no, marca la nota como "ambigua"** y decide igual. Las notas ambiguas se revisan en grupo, y así se mejora esta guía.
7. **Si la nota habla de riesgo** (morir, hacerse daño, violencia), **no la etiquetes**: márcala con "riesgo" y avisa a la persona responsable del piloto. Esas notas no se usan para entrenar.

## Etiquetas de tema

| Etiqueta | Sí | No (o es otra) | Casos borde |
|---|---|---|---|
| `sueno` | Dormir bien o mal, horas dormidas, insomnio, trasnochar, despertar cansado, siesta, "descansé anoche", "ando zombie", "no pegué pestaña", 😴 🥱 | "Me tomé la tarde libre" (`descanso`) | **Siesta** → `sueno` **y** `descanso` (es una pausa del día). **"Descansé harto anoche"** → solo `sueno` (habla de la noche). "Me muero de sueño" → `sueno` |
| `estres` | Estrés, ansiedad, nervios, agobio, presión, "colapsado", "chato", "reventado", "con la cabeza a mil", 😩 😰 🤯. **También el polo opuesto: calma** ("día tranqui", "todo piola", "me sentí relajado", "sin estrés") | Tener mucho trabajo **sin** decir cómo se siente → solo `estudio_trabajo` | "Ando chato" → `estres`. "Semana pesada" → `estres`. **Calma** → `estres` (no `animo`), igual que "dormí bien" es `sueno`. "Me tiene choreado todo" → `estres` **y** `animo` |
| `alimentacion` | Comidas, saltarse comidas, horarios de comida, **café**, comida chatarra, fruta, 🍔 🥗 ☕ | Agua → `hidratacion` | **Café** → `alimentacion` (no `hidratacion`). Jugo o bebida en vez de agua → `hidratacion` **y** `alimentacion` |
| `ejercicio` | Deporte, gimnasio, caminar, trotar, bici, yoga, pichanga (**también `social`**: se juega con otros), pasos, "no me moví nada", "cero ejercicio", 💪 🏃 | Caminar por obligación sin mencionarlo como actividad física ("caminé a la micro") → no, salvo que lo destaque | "Puro sillón" → `ejercicio` (falta de actividad) y `descanso` |
| `animo` | Cómo se siente en general: feliz, triste, bajoneado, con energía, "la raja", "pa la cagá", "día gris", 😊 😢 | Emociones por una causa específica ya etiquetada: "estrés por la prueba" no lleva `animo` | "Me siento solo" → `animo` **y** `social` |
| `social` | Amigos, familia, pareja, carrete, videollamadas, "no hablé con nadie", 🥳 🍻 | Compañeros de trabajo solo como contexto de trabajo ("reunión con el equipo" → `estudio_trabajo`) | "Almorcé con mi familia" → `social` **y** `alimentacion` |
| `estudio_trabajo` | Pega, pruebas, certámenes, tesis, entregas, turnos, reuniones, estudiar, 📚 💼 | — | "Harta pega" → `estudio_trabajo` (no es violencia) |
| `pantallas` | Celular, redes, series, videojuegos, tiktok, "scrollear", 📱 📺 | Trabajar en el computador → `estudio_trabajo` | "Dejé el celular fuera de la pieza" → `pantallas` |
| `hidratacion` | Agua, vasos, botella, "no tomé agua", 💧 | Café, alcohol → `alimentacion` (y `social` si es carrete) | — |
| `descanso` | Tiempo libre, pausas, siesta, actividades para relajarse ("me relajé leyendo"), "no paré en todo el día", vacaciones, 😌 | Dormir de noche → `sueno`. **Sentirse** relajado sin una actividad → `estres` (calma) | "Ni un respiro" → `descanso` **y** `estres` |

**Sin etiqueta:** "día normal", "nada especial", "ok", "meh". Está bien dejar una nota sin temas.

## Tono (T2): −2 a +2

¿Cómo se siente la persona **en la nota completa**?

| Tono | Cuándo | Ejemplos |
|---|---|---|
| −2 | Muy mal, varias cosas negativas o una muy intensa | "dormí pésimo, estoy colapsado y ando bajoneado 😢" |
| −1 | Algo mal | "dormí poco", "harta pega 😩" |
| 0 | Neutro, mezclado o solo informativo | "estudié toda la tarde", "fui al gym, cené pesado" |
| +1 | Algo bien | "salí a trotar 💪", "día tranqui" |
| +2 | Muy bien | "me siento la raja, dormí bacán y salí con los cabros" |

- Si hay cosas buenas y malas que se compensan → 0.
- Los hechos sin emoción ("dormí 7 horas") → 0, salvo que el contexto diga que es bueno o malo.
- **No adivines por el tema:** `ejercicio` no implica tono positivo.
- **Las palabras valorativas sí cuentan:** "nomás" ("dormí 6 horas nomás") → −1; "bacán", "la raja" → +1 o +2; "pesado", "eterna" → −1. Un hecho seco ("fui al gimnasio", "turno largo") → 0.
- **Entre 0 y ±1, si dudas, elige 0.** (En la prueba v1, casi todos los desacuerdos de tono fueron de un punto.)

## Marcas adicionales

- **Ambigua:** dos personas razonables podrían etiquetarla distinto.
- **Riesgo:** ver la regla 7. No se etiqueta.
- **Comentario libre:** opcional, para explicar dudas.

## Acuerdo entre personas

El 20% de las notas lo etiquetan dos personas, cada una sin ver lo que puso la otra. Se mide el **kappa de Cohen por etiqueta** (`ml/src/evaluacion/acuerdo.py`). **Si una etiqueta queda con kappa < 0,6, su definición es ambigua**: se reescribe esta guía o se fusiona con otra. **No se entrena sobre una etiqueta en la que las personas no se ponen de acuerdo.**

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-09-30 | Primera versión (F1) |
| v1.1 | 2026-09-30 | Tras la prueba con 100 notas (`decisions/005`): calma → `estres`; siesta → `sueno` + `descanso`; "descansé anoche" → solo `sueno`; pichanga → también `social`; palabras valorativas en el tono. **Sin validar todavía con personas** |
