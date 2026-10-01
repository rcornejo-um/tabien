# Principios Dicarch

**Doctrina de producto · v1.0 · es-CL · documento vivo**
*Fuente de verdad. Agnóstico de dominio: aplica a todo lo que Dicarch construye.*

---

## El manifiesto

Dicarch no es una marca de software ni una empresa de un producto. Dicarch es un **taller** —una disciplina— dedicado a explorar los límites del rendimiento. Tenemos una sola obsesión: hacer accesible lo que hoy parece exigir más de lo que la mayoría tiene. Vivimos un tiempo en que "calidad" se volvió sinónimo de "necesitas mejor hardware". Existimos para desmentir eso.

Nuestra tesis es una frase: **calidad sin importar la gama.** Queremos que en un teléfono lento, con la RAM justa, la conexión intermitente y la pantalla chica, sea posible lo que parecía reservado a la gama alta. Esos no son casos borde: son el campo donde se prueba si algo está *realmente* bien hecho. Para Dicarch el rendimiento no es una optimización que se deja para el final —es el primer principio de diseño y un acto de equidad. Cada megabyte que no descargamos, cada cuadro que no se traba, es una persona más a la que no le negamos algo bueno por el aparato que pudo comprar. **La excelencia en gama baja es excelencia para todos.**

> **Relación con el Marco Institucional.** Este documento es doctrina de *producto*: qué y cómo construimos. El [Marco Institucional](./marco-institucional.md) es doctrina de *organización*: cómo opera Dicarch. Cuando el Marco dice que el "rendimiento sostenido es ética", esto es su aplicación concreta: *calidad sin importar la gama*. Si algún día se contradicen, gana el Marco en lo organizacional y este documento en lo técnico, y se actualiza el que quedó atrás.

---

## Cómo se lee y cómo se usa

La tesis es el eje: cada principio, donde tenga sentido, se ata a una pregunta —**¿cómo le sirve esto a la gama baja?**. Cada principio tiene título corto, una afirmación tajante, su *por qué* y su *cómo se aplica*. Donde corresponde, trae una regla medible: un presupuesto, un umbral, un tiempo objetivo. Lo que no se puede medir no es un principio, es un afiche.

Una regla transversal antes de empezar: **todo proyecto Dicarch declara su "dispositivo de referencia"** —el aparato más modesto de su público objetivo— y todo se mide ahí, nunca en la máquina del desarrollador. El dispositivo de referencia es el juez.

---

## Pilar 1 — Identidad

### 1.1 Somos un taller, no una marca
**Practicamos una disciplina; no defendemos un catálogo.** Una marca protege productos; un taller protege un método. Por eso a cada proyecto lo juzgamos por si encarna la tesis, no por si "vende bien". *Cómo se aplica:* todo producto nuevo se evalúa primero contra estos principios; si los cumple, es Dicarch aunque sea raro; si no, no lo es aunque sea rentable.

### 1.2 Peleamos contra una idea
**La calidad no es un privilegio del hardware caro.** La industria entrenó a la gente para creer que "para que algo ande bien hay que comprar mejor aparato". Eso deja afuera a millones. *Cómo se aplica:* nuestro enemigo de diseño no es la fealdad ni la lentitud abstracta, es el requisito oculto que excluye. Cada vez que algo "necesita" más hardware, la pregunta es: ¿necesita, o nosotros no lo hicimos bien?

### 1.3 Liviano también es hermoso
**La belleza no pesa megabytes.** Si renunciar al peso significara renunciar al alma, la tesis sería una excusa para hacer cosas feas. No lo es. *Cómo se aplica:* estética tipo risografía —papel, tinta, paletas limitadas y con carácter—; tipografía del sistema antes que webfonts pesadas; decoración con CSS y SVG antes que imágenes; el detalle bonito se gana su peso o no entra. Una interfaz Dicarch se ve cuidada *y* baja liviano: esa es la prueba.

### 1.4 Hablamos en local y en claro
**Hablamos como la gente, no como la industria.** El lenguaje es parte de la accesibilidad: una palabra que el usuario no entiende es una puerta cerrada. *Cómo se aplica:* español de Chile, directo, sin jerga ni anglicismos innecesarios; los textos los entiende alguien sin formación técnica; los mensajes de error explican qué pasó y qué hacer, en vez de mostrar un código.

---

## Pilar 2 — Producto / Experiencia

### 2.1 Funciona en gama baja o no se publica
**Si solo anda bien en gama alta, está roto.** No es "optimizar después": es el criterio de aceptación. *Cómo se aplica:* nada se da por terminado hasta probarlo en el dispositivo de referencia y cumplir el presupuesto de rendimiento (Pilar 3). Andar bien en el computador del que lo programó no es evidencia de nada.

### 2.2 La accesibilidad es un derecho, no un *feature*
**Nadie queda afuera por su cuerpo, su edad o su aparato.** Un producto que no es accesible no es de menor calidad: está incompleto. *Cómo se aplica (mínimos, no aspiraciones):* contraste ≥ 4.5:1 (WCAG AA); navegable 100% con teclado y foco siempre visible; objetivos táctiles ≥ 44×44 px; texto escalable hasta 200% sin romper el diseño; compatible con lectores de pantalla; lenguaje claro en es-CL.

### 2.3 El costo lo paga Dicarch, no el usuario
**No exigimos hardware, datos ni conexión que el usuario no tiene.** Cada requisito que ponemos es plata, batería o megas del bolsillo de otra persona. *Cómo se aplica:* sin pisos de RAM o almacenamiento por encima del dispositivo de referencia; funciona con conexión intermitente y degrada con gracia (nunca pantalla en blanco); lo esencial sigue disponible sin conexión.

### 2.4 Lo visual antes que lo abstracto, la interacción antes que la receta
**Se entiende viendo y haciendo, no leyendo instrucciones.** El que llega excluido del mundo digital no necesita un manual, necesita poder tocar y ver qué pasa. *Cómo se aplica:* mostrar el estado de las cosas de forma concreta; preferir manipulación directa a formularios y pasos numerados; que la primera acción útil esté al alcance sin tutorial.

### 2.5 El error guía, no castiga
**Equivocarse no debe dar miedo ni vergüenza.** Un error que solo informa de la falla castiga; uno que ofrece la salida acompaña. *Cómo se aplica:* todo error dice qué pasó, por qué y el siguiente paso concreto; nada de códigos crípticos ni callejones sin salida; cuando se puede, deshacer en vez de prohibir.

### 2.6 Animación solo con propósito
**La animación que no explica nada solo gasta cuadros.** El movimiento puede enseñar (de dónde vino algo, a dónde va) o puede ser puro adorno que traba el aparato lento. *Cómo se aplica:* cada animación justifica que ayuda a entender; se respeta `prefers-reduced-motion` siempre; ninguna animación baja la fluidez por debajo del presupuesto (Pilar 3).

---

## Pilar 3 — Ingeniería / Arquitectura

### 3.1 El rendimiento es el primer principio, no el último parche
**Lo liviano se diseña, no se rescata.** Optimizar al final es maquillar deuda. *Cómo se aplica:* el presupuesto de rendimiento (3.2) se escribe *antes* de la primera línea de código y se trata como requisito, no como meta deseable.

### 3.2 Presupuesto de rendimiento explícito y medible
**Lo que no tiene presupuesto, no tiene límite, y lo que no tiene límite, engorda.** Cada proyecto fija su presupuesto y lo mide en su dispositivo de referencia. Estos son los **valores por defecto Dicarch** (para web; otros dominios traducen, nunca aflojan):

| Métrica | Objetivo por defecto | Se mide en |
|---|---|---|
| JavaScript inicial (comprimido) | ≤ 100 KB | dispositivo de referencia |
| Ruta crítica completa (comprimida) | ≤ 150 KB | dispositivo de referencia |
| Peso total de la carga inicial | ≤ 500 KB | dispositivo de referencia |
| Tiempo hasta interactivo (CPU lenta + 3G) | ≤ 5 s | dispositivo de referencia |
| Respuesta a una interacción | ≤ 100 ms | dispositivo de referencia |
| Transición entre vistas | ≤ 300 ms | dispositivo de referencia |
| Fluidez | 60 fps; ningún cuadro > 16 ms | dispositivo de referencia |
| Dependencia individual | > 30 KB comprimido ⇒ se justifica o se reemplaza | build |

Regla de oro del presupuesto: **se puede apretar, nunca aflojar sin justificación escrita** revisada por una segunda persona (o por el MCD con validación humana).

### 3.3 Motor *data-driven*
**Crecer es agregar datos, no tocar el motor.** Si cada caso nuevo obliga a reescribir lógica, el sistema no escala: se pudre. *Cómo se aplica:* la lógica vive en un motor estable y el comportamiento se define con datos/configuración; sumar funcionalidad debería ser, casi siempre, sumar datos.

### 3.4 Piezas reutilizables
**Construimos con un kit, no reinventamos en cada pantalla.** La repetición es peso, bugs y horas. *Cómo se aplica:* componentes y utilidades comunes en un kit compartido; antes de crear algo nuevo, se busca si ya existe la pieza.

### 3.5 Carga diferida agresiva
**Lo pesado baja solo cuando se necesita, no antes.** El usuario de gama baja no debería pagar por funciones que quizá nunca abre. *Cómo se aplica:* *code splitting* por ruta/función; imágenes y vistas secundarias con carga diferida; lo crítico primero, el resto bajo demanda.

### 3.6 Dependencias bajo sospecha
**Cada dependencia es peso, superficie de fallo y deuda ajena.** Una librería cómoda hoy puede ser un ancla mañana. *Cómo se aplica:* toda dependencia que sume **> 30 KB comprimido** justifica su peso por escrito o se reemplaza por algo más liviano (o por código propio); se prefiere la plataforma (APIs nativas) antes que una librería.

### 3.7 Tipado estricto como red de seguridad
**El tipo es documentación que el compilador verifica.** En equipos chicos, el tipado atrapa errores que nadie va a alcanzar a revisar a mano. *Cómo se aplica:* tipado estricto activado; nada de escapes silenciosos del sistema de tipos; el tipo describe la intención, no solo la forma.

### 3.8 Lo que no se mide, no se mejora
**Sin medición no hay rendimiento, hay fe.** *Cómo se aplica:* medición de peso, tiempos y fluidez integrada al flujo de trabajo; el dispositivo de referencia es donde se toma la medida; las mejoras se afirman con números, no con sensaciones.

---

## Pilar 4 — Proceso / Calidad

### 4.1 Build verde innegociable
**Nada rojo entra a la rama principal.** Un build roto que se integra "para arreglarlo después" contamina el trabajo de todos. *Cómo se aplica:* la integración exige build, tipos y pruebas en verde; sin excepciones por apuro.

### 4.2 Cada cambio se pesa
**Si sube el peso, hay que saber por qué.** El engorde es gradual y silencioso; se controla cambio a cambio o no se controla. *Cómo se aplica:* se mide peso y tiempo de carga (en el dispositivo de referencia) por cada cambio relevante; si crece el peso, queda justificado o no entra.

### 4.3 Revisión contra los estándares antes de integrar
**Se revisa contra la Checklist Dicarch, no contra el gusto del momento.** *Cómo se aplica:* antes de integrar, el cambio pasa la Checklist (abajo); lo que no la pasa, vuelve.

### 4.4 Disciplina en commits y despliegue
**Un historial claro es memoria; un despliegue reversible es seguro.** *Cómo se aplica:* commits atómicos y con mensaje que explica el *por qué*; despliegues reversibles, con plan de vuelta atrás antes de soltar.

### 4.5 Documentar es parte del trabajo
**Lo que no está documentado no existe institucionalmente.** *Cómo se aplica:* la decisión y su razón se documentan junto al cambio, no "después"; esto cierra el ciclo con la memoria institucional del Marco.

---

## Checklist Dicarch

Antes de publicar cualquier trabajo —de cualquier dominio— responde. Si alguna respuesta es "no", todavía no está listo.

- ¿Lo probaste en el **dispositivo de referencia**, y no solo en tu máquina?
- ¿Cumple el **presupuesto de rendimiento**? Si lo excede, ¿está justificado por escrito?
- ¿Funciona con **conexión intermitente o sin conexión**, degradando con gracia?
- ¿Es **navegable solo con teclado**? ¿El foco se ve siempre?
- ¿Cumple contraste, tamaños táctiles y texto escalable (**accesibilidad mínima**)?
- ¿Respeta **`prefers-reduced-motion`**? ¿Cada animación explica algo?
- ¿Lo entiende una **persona sin formación técnica**? ¿El lenguaje es es-CL y claro?
- ¿Los **errores guían** en vez de castigar?
- ¿Cada **dependencia pesada** (> 30 KB) justifica su peso?
- ¿El **build está verde**?
- ¿**Pesaste el cambio**? Si subió el peso, ¿sabes por qué?
- ¿Está **documentado**?
- ¿Es **hermoso sin ser pesado**?

**La pregunta madre:** ¿esto le sirve, de verdad, a alguien con el teléfono más lento y la peor conexión? Si no, no es Dicarch todavía.

---

## Procedencia

Esta filosofía cristalizó por primera vez en un producto real, **Numeria**, que mostró cómo se ve la obsesión aplicada: lo visual antes que lo abstracto, nada de jerga, interacción en vez de recetas, animación con propósito y respetando `prefers-reduced-motion`, el error que guía, lenguaje local y claro. En lo técnico ya encarnaba lo que aquí se eleva a doctrina general: motor *data-driven*, kit de piezas reutilizables, carga diferida agresiva, dependencias bajo sospecha y tipado estricto. Numeria es la primera prueba de concepto, no la definición de Dicarch: este manifiesto sirve a cualquier cosa que construyamos después.

---

## Versionado

Documento vivo. Se actualiza cuando cambia la realidad de cómo construimos, no por calendario.

**v1.0** — Primera doctrina de producto separada del Marco Institucional. Tesis "calidad sin importar la gama" como eje. Cuatro pilares. Presupuesto de rendimiento por defecto. Checklist Dicarch. Numeria reposicionada como prueba de concepto.
**Próxima revisión:** cuando un proyecto nuevo obligue a tocar un presupuesto por defecto, o cuando un principio choque con la realidad de un producto.
