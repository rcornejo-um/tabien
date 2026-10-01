# Contrato del motor de patrones — `patrones-v1` (T5)

Python (`ml/src/patrones/`, referencia) y TS (`app/src/ml/patrones/`, dispositivo) implementan este algoritmo y deben dar los mismos números: tolerancia 1e-9 en ρ, p y q, e igualdad exacta en la lista de hallazgos. Los parámetros están en `spec/patrones/config-v1.json`. **Ningún hallazgo usa lenguaje causal.**

## Entrada

Una persona: lista de días `{dia: entero, valores: {variable: número | null}}`. `dia` es un índice de calendario: los huecos significan días sin registro. Los temas valen `1` o `0` si ese día hubo nota (`null` si no hubo), los números son lo ingresado (`null` si no se ingresó) y el tono es el de T2 (si existe).

**Los días en que se activó la capa de riesgo entran con todos los temas y el tono en `null`.** Su contenido no alimenta hallazgos.

## 1. Mínimo de datos

"Días con datos" = días con al menos un valor no nulo. Si son menos de `dias_minimos` (14), **no hay hallazgos ni tendencias**: se devuelve `{"motivo": "pocos_dias", "dias_con_datos": n}`.

## 2. Relaciones con desfase

Para cada `x` en `config.x` y cada `y` en `config.y` (con `x ≠ y`), con **un solo desfase `L = config.desfase_por_y[y]`**: 1 para `sueno_horas` ("esa noche") y 0 para el resto (el mismo día). Fijar el desfase por lógica temporal, en vez de probar 0, 1 y 2, reduce las hipótesis por persona de ~78 a ~26 (ver `decisions/007`):

1. **Pares:** días `d` con `x(d)` no nulo **y** con `y(d + L)` no nulo (se busca por índice de día, no por posición). `n` = cantidad de pares.
2. Se descarta si `n < pares_minimos`, si `x` o `y` son constantes en los pares, o si:
   - `x` es tema y hay menos de `minimo_por_grupo` pares con `x = 1` o con `x = 0`;
   - `x` es numérico y hay menos de `minimo_por_grupo` pares por encima o por debajo de la mediana de `x` (los iguales a la mediana no cuentan).
3. **ρ de Spearman:** Pearson sobre rangos promedio (los empates reciben el promedio de sus posiciones, que empiezan en 1).
4. **p (dos colas):** `t = ρ·√((n−2)/(1−ρ²))`, `p = I_{(n−2)/(n−2+t²)}((n−2)/2, 1/2)` (beta incompleta regularizada). Si `|ρ| ≥ 1 − 1e-12`, `p = 0`.
5. **Evidencia:** si `x` es tema, media de `y` con `x = 1` y con `x = 0` (y cuántos días tiene cada grupo); si `x` es numérico, lo mismo para `x > mediana` y `x < mediana`.

## 3. Control de falsos descubrimientos

Benjamini-Hochberg **por persona**, sobre todas las pruebas del paso 2 (m = las que no se descartaron): se ordena por p ascendente (empates: orden de evaluación `x`, `y`, `L`), `q_i = min_{j ≥ i} (p_j · m / j)` y se recorta a 1.

## 4. Tamaño de efecto y contracción

`ρ_c = ρ · n / (n + n0)`, con `n0 = contraccion_n0` (10). Con pocos pares, ρ se acerca a 0. **Hoy el patrón poblacional es 0** (sin datos reales no hay otro prior honesto); cuando exista D1, el prior será la ρ poblacional del par.

## 5. Hallazgos

Un resultado es **hallazgo** si `q ≤ q_fdr` (0,1) **y** `|ρ_c| ≥ rho_minimo` (0,3). Orden de salida: `q` ascendente, luego `|ρ_c|` descendente, luego `x`, `y`.

**Confianza:** `alta` si `q ≤ 0,01` y `n ≥ 30`; si no, `media`.

## 6. Tendencias (descriptivas)

Para `sueno_horas`, `pasos` y `vasos_agua`, con `D` = último día con datos: *reciente* = días en `(D−7, D]` y *base* = días en `(D−28, D−7]`. Se necesitan al menos 5 valores recientes y 10 de base, y una desviación estándar de base (muestral, n−1) mayor que 0. Se calcula `d = (media_reciente − media_base) / de_base`, y es tendencia si `|d| ≥ 0,8`. No hay prueba estadística: se muestra como "esta semana", nunca como hallazgo.

## 7. Racha de registro

Días seguidos con registro que terminan en `D`. La app **no** la muestra si algún día de la racha activó la capa de riesgo.

## 8. Frases (solo en la app)

Se arman desde la salida estructurada, con plantillas **no causales** ("cuando…, suele…", "los días que…"). Para `sueno_horas` hay que tener presente que el valor del día `t` es la noche **anterior** a `t`. Por eso, con `x` del día `t` y desfase 1, se habla de "esa noche".
