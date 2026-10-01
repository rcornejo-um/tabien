# Seguridad de la persona

> **Estado:** esqueleto de F0. La capa de riesgo se implementa en **F1**, con un léxico revisado por una persona. En F0 **no existe** un detector "de mentira": un módulo que nunca se activa sería el silencio que este documento prohíbe.

## 1. Capa de riesgo (T7)

- **Solo reglas**, curadas y revisadas por una persona. Sin ML.
- Corre **siempre primero**, sobre el texto original, antes de anonimizar o normalizar.
- **La falla aceptable es la falsa alarma, no el silencio.** Ante la duda, se activa.
- El léxico se versiona (`riesgo-vN`) y tiene tests: positivos, negativos y frases con negación o ironía ("me muero de sueño" ≠ riesgo).

**Si se activa:**
1. Se muestran recursos de ayuda, en lenguaje cálido y sin juicio.
2. Ese día **no** se proponen hábitos, rutas ni rachas.
3. Ese contenido **nunca** se gamifica ni se "puntúa".
4. No se guarda la clasificación de riesgo como dato para ningún modelo.

### Recursos de ayuda (Chile)

| Recurso | Número | Estado |
|---|---|---|
| Línea de prevención del suicidio (MINSAL) | \*4141 | **a verificar antes de publicar** |
| Salud Responde | 600 360 7777 | **a verificar antes de publicar** |
| Emergencias (SAMU) | 131 | **a verificar antes de publicar** |

## 2. Guardarraíles de alimentación

El catálogo de hábitos **prohíbe**: restricción calórica, ayuno, metas de peso, conteo de calorías y lenguaje de "comida mala/culpa". Los hábitos de comida solo pueden ser **aditivos** ("agregar una fruta") o **de regularidad** ("almorzar a una hora fija"). Lo verifica un test del catálogo (F4).

## 3. Lenguaje

- **No causal:** "cuando pasa X, suele pasar Y". Nunca "X causa Y".
- **No clínico:** nunca "tienes insomnio", "ansiedad", "depresión" como diagnóstico.
- La incertidumbre se muestra tal cual: "no hay evidencia suficiente para decir que cambió" es un resultado válido.

## 4. Pendientes

- [ ] Léxico de riesgo v1 y su revisión humana (F1).
- [ ] Verificar los números de ayuda vigentes (antes de cualquier publicación).
- [ ] Test de guardarraíles del catálogo (F4).
