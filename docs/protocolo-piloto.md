# Protocolo del diario piloto (D1) — borrador v1

> **Estado: borrador de prototipo.** El piloto **no empieza** hasta cumplir la lista "Antes de empezar" (al final). Cada punto bloquea.

## 1. Objetivo

Reunir notas **reales**, escritas como la gente escribe, para entrenar y evaluar la comprensión de notas (T1 temas, T2 tono, T3 cantidades). Los datos sintéticos (D0) no sirven para eso: un modelo entrenado con ellos aprende el generador, no a las personas.

**Meta mínima antes de afirmar cualquier desempeño:** 1.000 notas etiquetadas de al menos 15 personas.

## 2. Participantes

- Entre **15 y 30** personas voluntarias, **mayores de 18 años**, que vivan en Chile.
- Buscamos variedad: estudiantes y personas que trabajan, distintas carreras y oficios, distintos teléfonos (incluidos los de gama baja).
- **Criterios de exclusión:** menores de 18. Personas que estén pasando por una crisis de salud mental en este momento: se les agradece y se les comparten recursos de ayuda. Tabien no es un servicio de salud.
- Participar es voluntario, sin pago condicionado a escribir, y se puede abandonar en cualquier momento sin dar explicaciones.

## 3. Qué hace cada participante

1. Lee y firma el consentimiento (`docs/consentimiento.md`).
2. Abre la app mínima (pantalla Hoy) en su teléfono. No necesita crear cuenta.
3. Durante **4 a 6 semanas** escribe **una nota corta al día**, como le salga, y si quiere anota horas de sueño, pasos y vasos de agua.
4. Al final de cada semana (o al terminar) va a "Mis datos → Enviar al piloto", marca el consentimiento **de esa exportación** y entrega el archivo por el canal acordado.
5. Guarda su **código de participante** (aparece al exportar) por si quiere pedir el borrado.

## 4. Qué se recolecta (y qué no)

| Se recolecta | No se recolecta |
|---|---|
| Texto de la nota, **anonimizado en el teléfono** (correos, teléfonos y RUT → etiquetas) | Nombre, RUT, correo, teléfono, ubicación |
| Horas de sueño, pasos y vasos de agua, si se ingresaron | Fechas reales (se cambian por "día 0, 1, 2…" y día de la semana) |
| Un código aleatorio de participante | Identificadores del dispositivo, analítica, cookies |
| | El texto de días en que la capa de riesgo se activó (se exporta como `<omitida_por_seguridad>`) |

**Limitación conocida:** la anonimización v1 **no** borra nombres de personas ("la Cata"). Se le pide a cada participante revisar su archivo antes de entregarlo, y además una persona del equipo lo revisa al recibirlo (ver §6).

## 5. Seguridad de participantes

- La app muestra recursos de ayuda **siempre** (botón "¿Necesitas ayuda ahora?") y automáticamente si la capa de riesgo detecta algo.
- **Tabien no monitorea a nadie y no avisa a nadie.** Eso se dice claramente en el consentimiento: nadie del equipo lee las notas en tiempo real.
- Si al revisar una exportación aparece contenido de riesgo que la capa no detectó, se sigue el protocolo de contención que defina la persona responsable clínica (**pendiente**) y se agrega el caso a los fixtures de riesgo.

## 6. Manejo de los datos

1. Los archivos recibidos se guardan en `ml/data/piloto/` (excluido de git) en un equipo con disco cifrado.
2. Una persona del equipo revisa cada archivo para borrar a mano los nombres propios que hayan quedado, y registra cuántos encontró (para medir la anonimización).
3. Se crea un manifiesto con el sha256 de cada archivo (`ml/data/manifiestos/`).
4. **La bóveda:** antes de mirar ningún dato, se separa al azar un 20% de participantes como conjunto de prueba congelado. Su lista y su hash quedan registrados en `decisions/`.
5. **Borrado:** con el código de participante, se borran sus archivos y se registra el borrado. Si ya se entrenó un modelo con esos datos, el modelo se marca para reentrenar sin ellos.
6. **Retención:** los datos se borran al terminar el proyecto o a los **12 meses** (lo que ocurra primero). *A verificar contra la Ley 21.719.*

## 7. Etiquetado

Según `docs/guia-etiquetado.md`. El 20% de las notas lo etiquetan dos personas, sin ver lo que puso la otra, y se mide el kappa por etiqueta. Las notas de días con riesgo no se etiquetan ni se usan.

## Antes de empezar (todo obligatorio)

- [ ] Una persona con formación en salud mental revisó y aprobó el léxico de riesgo (`spec/riesgo/lexico-v1.json`), los textos de ayuda y el protocolo de §5.
- [ ] Se verificaron los números de ayuda vigentes (\*4141, 600 360 7777, 131).
- [ ] Se verificaron los requisitos de la Ley 21.719 para datos sensibles de salud (`docs/privacidad.md`), incluida la retención.
- [ ] Se confirmó si la universidad exige que lo apruebe un comité de ética y, si es así, se obtuvo la aprobación.
- [ ] Hay al menos dos personas etiquetadoras capacitadas con la guía.
- [ ] La app mínima se probó en un teléfono de gama baja real.
- [ ] El canal de entrega de archivos está definido y no deja copias en servicios de terceros.
