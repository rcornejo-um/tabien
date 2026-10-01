# 007 — Motor de patrones v1 (T5)

**Fecha:** 2026-09-30 · **Fase:** F3 · **Estado: Parcial**. La mecánica, la paridad, la regla de 14 días y el costo están aprobados. **La sensibilidad falla** y la FDR solo cumple con 120 días.

## Hipótesis (criterio F3 del prompt maestro)

Con D0: (1) sensibilidad ≥ 0,8 para efectos plantados de magnitud moderada con 30 o más días; (2) tasa de falsos descubrimientos ≤ 0,1; (3) ningún hallazgo con menos de 14 días.

## Decisiones previas a medir

1. **Verdad de fondo.** La pregunta 4 del checkpoint de F1 quedó sin respuesta, y se tomó la recomendación: una asociación indirecta pero real **cuenta como acierto**, porque los hallazgos no son causales. Para cada persona se simulan **3.000 días con sus mismos parámetros**, y un par está asociado si |ρ_largo| ≥ 0,1. Un hallazgo es falso si su par no está asociado.
2. **Sensibilidad.** Se mide sobre el **par observable** del efecto plantado: escribir sobre estrés → sueño de esa noche; escribir sobre ejercicio → tono; escribir sobre pantallas → sueño de esa noche.
3. **Disciplina.** Los parámetros se ajustaron solo con la semilla 11. El resultado final se midió una sola vez con las semillas nuevas 31 y 32.

## Cambios durante el ajuste (semilla 11) y por qué

| Cambio | Motivo | Efecto en la semilla 11 |
|---|---|---|
| Desfase **fijado por lógica temporal** (sueño: "esa noche" = 1; el resto: el mismo día = 0) en vez de probar 0, 1 y 2 | Menos hipótesis por persona (~78 → ~26) significa menos castigo por comparaciones múltiples. **Se aparta del "0 a 2 días" de §6.6** | FDR 0,28 → 0,14 |
| No duplicar correlaciones simétricas del mismo día (pasos↔agua) | Eran la misma prueba contada dos veces | Menos pruebas |
| q de 0,10 → **0,05** | Con q = 0,1, ~10% de las personas **sin ningún patrón** recibe un hallazgo falso (medido: 29 de 300). Se prefiere mostrar menos y que sea confiable | En laboratorio, FDR con ρ = 0,6 y 90 días: 0,13 → 0,08 |

También se verificó la **calibración de los valores p**: bajo la hipótesis nula, el 4,74% de 8.837 pruebas da p < 0,05. La estadística propia coincide con scipy en 1e-9 (Spearman, p, beta incompleta y BH).

## Resultado final (semillas nuevas, 40 personas, con tono como si existiera T2)

| Escenario | Hallazgos | Falsos | **FDR** | Sensibilidad moderada | Sensibilidad fuerte |
|---|---|---|---|---|---|
| 30 días | 7 | 2 | 0,29 ❌ | 0,00 ❌ | 0,00 |
| 60 días | 31 | 4 | 0,13 ❌ | 0,05 ❌ | 0,05 |
| 120 días | 51 | 2 | **0,04 ✅** | 0,05 ❌ | 0,11 |
| 60 días sin tono (como en la app) | 7 | 3 | 0,43 ❌ | 0,04 | 0,00 |
| 60 días, temas con 10% de ruido | 22 | 6 | 0,27 ❌ | 0,00 | 0,03 |
| **Hallazgos con < 14 días** | — | — | — | — | **0 de 40 en todos ✅** |

Archivos: `bench/resultados/f3_evaluacion_d0.json` y `f3_potencia.json`.

## Por qué falla la sensibilidad (diagnóstico)

**No es un error del motor: los efectos de D0 son demasiado débiles a través de lo observable.** El efecto plantado actúa sobre el estrés *latente*, pero la persona solo *a veces* escribe sobre estrés. Incluso con el efecto "fuerte", la ρ verdadera del par observable es de **−0,13 a −0,33** (medida con 3.000 días). Con ~30 pares por persona (hace falta nota hoy *y* sueño mañana), esas correlaciones no se distinguen del ruido.

**Curva de potencia** (laboratorio: una sola asociación plantada directamente en lo observable, el resto independiente; 200 personas por celda):

| ρ observable | 30 días | 60 días | 90 días | 120 días |
|---|---|---|---|---|
| 0,3 | 0,03 | 0,08 | 0,12 | 0,27 |
| 0,4 | 0,08 | 0,21 | 0,40 | 0,62 |
| 0,5 | 0,16 | 0,50 | 0,71 | **0,88** |
| 0,6 | 0,27 | **0,76** | **0,96** | **1,00** |

Leído en simple: **el motor encuentra asociaciones fuertes (ρ ≥ 0,5) si hay 2 a 4 meses de datos**. Con 30 días casi no encuentra nada, y lo poco que encuentra tiene más riesgo de ser falso.

## Aprendizajes

1. **El criterio "≥ 0,8 con 30 días para efectos moderados" no se puede cumplir** con ningún motor honesto si "moderado" significa ρ observable ≈ 0,2. Para cumplirlo habría que relajar el control de falsos descubrimientos, y eso es justo lo que el proyecto prohíbe.
2. **La FDR agregada** (falsos / total mostrado) sube cuando hay pocos hallazgos verdaderos, aunque cada persona cumpla su BH. Lo que la persona experimenta es la tasa agregada.
3. **"Tema mencionado" pierde la dirección.** "Estrés" incluye tanto "colapsado" como "tranqui" (guía v1.1), y eso diluye la señal. Con M0, la persona de ejemplo pierde el hallazgo estrés→sueño que sí aparece con las etiquetas del generador.
4. Costo en el dispositivo: **20 ms con CPU 4×** para 61 días, en el hilo principal (presupuesto de interacción: 100 ms).

## Decisiones que necesitan a la persona responsable

- **Redefinir el criterio de sensibilidad en términos observables** (por ejemplo, ≥ 0,8 para ρ ≥ 0,5 con ≥ 90 días; hoy da 0,71 con 90 y 0,88 con 120) **o** aceptar que el motor muestre hallazgos recién con más datos.
- **Subir el mínimo para mostrar hallazgos** de 14 a ~45–60 días baja los falsos, porque con 30 días la FDR es 0,29. Se mantiene "nunca antes de 14", pero 14 resultó ser un mínimo técnico, no uno útil.
- **Temas con polaridad** (estrés alto vs calma) como variables distintas, cuando exista T2 o un M0 con dirección.
