# 006 — Capa de riesgo v1 (prototipo)

**Fecha:** 2026-09-30 · **Fase:** F1 · **Estado:** Aprobado como **prototipo técnico**. **No apto para personas reales** hasta la revisión clínica.

## Contexto

§4.2 del prompt maestro: un módulo de reglas, de alta sensibilidad, que corre antes que todo. Su falla aceptable es la falsa alarma, no el silencio. Debe tener un léxico revisado por una persona, versionado y con tests. La persona responsable del proyecto indicó que Tabien es por ahora "más un prototipo" y que la revisión del léxico no es prioritaria. Se respeta para avanzar, pero **queda como bloqueo explícito** para cualquier uso con personas (`docs/protocolo-piloto.md`, "Antes de empezar").

## Hipótesis

Un léxico de reglas con frontera de palabra explícita y una lista corta de excepciones para modismos (1) detecta frases de riesgo comunes en es-CL, con o sin tildes, mayúsculas o letras alargadas; (2) no se activa con los modismos chilenos más frecuentes ("me muero de sueño", "harta pega", "me pegó un resfrío"); (3) se comporta igual en Python y en TS.

## Método

- Contrato `spec/riesgo.md`, léxico `spec/riesgo/lexico-v1.json` (16 reglas en 3 categorías y 3 excepciones). Preparación del texto propia, independiente de `texto-v1`, para que un cambio en el pipeline del modelo no pueda apagar esta capa.
- Fixtures escritos a mano: 18 positivos (3 de ellos **falsas alarmas aceptadas a propósito**), 11 negativos y 3 de preparación.
- Control de falsas alarmas: correr la capa sobre las 1.937 notas sintéticas de D0.

## Resultado

| Prueba | Resultado |
|---|---|
| Fixtures en Python | 34/34 |
| Fixtures en TS | 33/33 |
| Falsas alarmas sobre 1.937 notas sintéticas | 0 |
| En la app: se evalúa antes de guardar, muestra ayuda y da el foco al panel; la exportación omite el texto | E2E 13/13 |

## Aprendizaje / riesgos

- **La sensibilidad real no está medida.** Los positivos los escribió el mismo equipo que escribió las reglas: pasan por construcción. Hace falta un conjunto de frases de riesgo escrito por otra persona (idealmente clínica) para medir la exhaustividad de verdad.
- **Las negaciones no se interpretan** ("no quiero morir" se activa). Es una decisión deliberada a favor de la falsa alarma.
- Modismos muy frecuentes que se activan igual ("me voy a matar estudiando"). Si en el piloto la tasa de falsas alarmas molesta, se agregan excepciones, pero cada una baja la sensibilidad y necesita revisión clínica.
- Cubre solo español escrito. No detecta riesgo expresado con emojis solos, con ironía o en otros idiomas.
- La exportación **re-evalúa** cada nota con el léxico vigente: si una versión futura detecta más, los textos antiguos también se omiten.
