# Privacidad

> **Estado:** borrador de F0. **Nada de lo marcado "a verificar" se puede asumir como cierto.** Antes de recolectar el primer dato del piloto (F1), una persona revisa este documento contra el texto oficial de la ley y su reglamento.

## Principios del producto

1. **Local-first.** Las notas, el historial, los modelos personales y la inferencia viven en el dispositivo (IndexedDB). No hay backend en el MVP.
2. **Opt-in por acción.** Ningún dato sale del dispositivo sin un consentimiento explícito para *esa* acción (por ejemplo, "exportar mis notas anonimizadas para el piloto"). No hay consentimientos amplios ni casillas premarcadas.
3. **Minimización.** No se guarda nada que el sistema no use. No se piden nombre, RUT, correo ni ubicación.
4. **Anonimización antes de exportar.** Correo → `<email>`, teléfono → `<telefono>`, RUT → `<rut>` (desde F0, ver `spec/texto.md`). Nombres propios desde F2. La anonimización por reglas **no es perfecta**: la exportación del piloto la revisa además una persona.
5. **Borrar todo** es un solo toque y es definitivo (sin papelera, sin copia oculta).
6. **Sin atributos protegidos** como variables de ningún modelo.

## Marco legal: Ley 21.719 (Chile)

Lo que se sabe con razonable seguridad, y lo que hay que confirmar:

| Punto | Lo que entendemos | Estado |
|---|---|---|
| La ley modifica la Ley 19.628 sobre protección de la vida privada | Sí | a verificar en texto oficial (BCN) |
| Fecha de entrada en vigencia | Diciembre de 2026 (1 de diciembre, 24 meses tras su publicación en diciembre de 2024) | **a verificar** |
| Los datos de salud son **datos sensibles** | Sí | a verificar el artículo exacto |
| Tratar datos sensibles requiere, por regla general, **consentimiento expreso** del titular | Entendemos que sí, con excepciones legales | **a verificar** |
| Derechos del titular: acceso, rectificación, supresión, oposición y portabilidad | Entendemos que sí | **a verificar** |
| Se crea una Agencia de Protección de Datos Personales con facultad sancionatoria | Entendemos que sí | **a verificar** montos y gradualidad |
| Obligaciones específicas para investigación con voluntarios (piloto D1) | No lo sabemos | **a verificar**; además, revisar si la universidad exige comité de ética |

### Cómo responde el diseño (independiente de los detalles legales)

- **Consentimiento expreso e informado** para el piloto, por escrito, con propósito, plazo, forma de anonimización y cómo pedir borrado (`docs/protocolo-piloto.md`, F1).
- **Derechos del titular:** la persona ve todo lo que se guardó (pantalla Ajustes), puede exportarlo en un formato legible (JSON) y puede borrarlo todo.
- **Sin transferencia a terceros.** Ningún SDK de analítica, ni CDN que reciba datos de la persona.
- **Datos del piloto fuera de git.** `.gitignore` excluye `ml/data/real/`, `ml/data/piloto/`, exportaciones y archivos de notas.

## Registro de verificaciones

| Fecha | Qué se verificó | Fuente | Persona |
|---|---|---|---|
| — | (pendiente antes de F1) | — | — |
