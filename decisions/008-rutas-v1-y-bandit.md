# 008 — Rutas de hábitos v1 y evaluación fuera de línea del bandit (T6)

**Fecha:** 2026-09-30 · **Fase:** F4 · **Estado: Aprobado** (con salvedades). La app usa **v1 (reglas)**.

## Hipótesis (criterio F4)

1. El 100% del catálogo pasa los guardarraíles de §4.2.
2. El bandit v2 (Thompson) tiene menor arrepentimiento que la política v1 en el simulador, con intervalo. Si no lo logra, se queda v1.

## Catálogo (`spec/rutas/catalogo-v1.json`)

19 micro-hábitos en 6 rutas de 3 a 4 pasos con dificultad progresiva: dormir mejor, pantallas en la noche, moverte más, tomar agua, comer con regularidad y pausas para el estrés. Cada paso trae fuente, guardarraíles y contraindicaciones. Los hábitos de comida son solo **aditivos o de regularidad**.

**Fuentes:** CDC y AASM (sueño), OMS 2020 (actividad física), EFSA 2010 (agua), OMS (alimentación sana) y OMS 2020 "Doing What Matters" (estrés). ⚠️ Las citas las escribió el equipo técnico de memoria: **hay que verificar el enlace, la vigencia y que cada fuente respalde su paso** antes de usar el catálogo con personas. Saqué los ISBN que no pude confirmar.

## Resultado 1: guardarraíles

`ml/tests/test_catalogo.py`: el catálogo pasa (0 violaciones), y el verificador **atrapa** 6 hábitos prohibidos inyectados (calorías, ayuno, saltarse comidas para bajar de peso, pesarse, porción menor, lenguaje clínico). Esa prueba destapó un hueco real ("Pésate" no contenía "peso") y un falso positivo propio ("pan**talla**s" contenía "talla"); los dos quedaron corregidos. **Aprobado: 19/19.**

## Política v1 (app)

Metas de la persona (hasta 2) → áreas que sugieren los hallazgos → paso más fácil elegible. Cada sugerencia muestra su **porqué** ("Porque elegiste…" o "Porque notamos esto: «…»"). Progresión con 7 días en el paso: ≥ 70% avanza, < 40% retrocede a un paso más fácil (o repite con una semana nueva). "Muy difícil" retrocede de inmediato y "No aplica" saca el área por 30 días. Si hoy se activó la capa de riesgo, no se propone nada. Tests: 9 del motor y 5 del núcleo.

## Resultado 2: simulador (`ml/src/rutas/simulador.py`)

Son 300 personas con rasgos de D0 y preferencias **ocultas** por hábito: sus rasgos más un componente personal N(0, 1) que ninguna política ve. La simulación dura 26 semanas. La recompensa es aceptar el hábito y cumplirlo al menos 4 de 7 días. El arrepentimiento se mide contra el mejor hábito elegible de cada semana. El bandit corre **por persona** (local-first) y solo explora dentro del catálogo.

**Error de medición corregido durante el desarrollo:** al principio, las semanas en que v1 no proponía nada (había vetado todas sus áreas) no sumaban arrepentimiento, y eso favorecía a v1. Además, v1 vetaba un área para siempre, mientras que la app la veta 30 días. Corregido antes de la medición final.

| Semilla final 53 (nunca vista) | v1 (reglas) | v2 (bandit) | Diferencia [IC 95%] |
|---|---|---|---|
| Arrepentimiento medio (26 semanas) | 9,78 | **7,83** | **1,96 [1,50; 2,42]** a favor del bandit |
| Semanas exitosas | 9,16 | 9,47 | +0,31 [−0,05; 0,67], **no significativa** |
| Dificultad media propuesta | 1,48 | 1,54 | — |

**El criterio se cumple:** el bandit tiene menor arrepentimiento, con un intervalo que excluye el 0.

## Por qué la app sigue con v1

1. La ventaja del bandit se ve en el arrepentimiento, pero **no** se traduce en más semanas exitosas con significancia.
2. El resultado depende por completo de un simulador cuyas preferencias **inventé yo**. Si las personas reales no tienen ese "componente personal", el bandit no tendría nada que aprender.
3. v1 es explicable ("porque notamos X"). El bandit eligiendo por muestreo es más difícil de explicar.

**Para activar v2:** datos reales del piloto (aceptación y cumplimiento por hábito), volver a evaluar con preferencias estimadas desde esos datos, y un porqué que siga siendo honesto.

## Pendiente

Experimentos personales n-de-1 (§6.7): `parking_lot.md` #15.
