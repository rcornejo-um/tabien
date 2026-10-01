# 009 — Rediseño visual "Aero" (reemplaza "cielo vivo")

**Fecha:** 2026-09-30 · **Fase:** F4 · **Estado:** Aprobado

## Contexto

La persona responsable pidió un front "más futurista y celestial, tipo Frutiger Aero, con celestes claros, azules fuertes y verdes fuertes, minimalista pero con degradados". Esto **reemplaza** la paleta "cielo vivo" de §7 del prompt maestro (medianoche, cian, magenta, oro y violeta).

## Decisión

- **Claro (por defecto):** cielo celeste en degradado (`#e6f7ff → #a9ddff → #e9fbf3`) con resplandores azul y verde, tarjetas de **vidrio esmerilado** (blur, borde blanco y brillo interior) y burbujas solo con CSS (sin imágenes y sin animación).
- **Oscuro (si el sistema lo pide):** "aero nocturno", de azul profundo a verde azulado, con el mismo vidrio.
- **Acentos:** botón principal **azul** brillante (degradado y reflejo en la mitad superior) y acciones positivas en **verde** brillante ("Sí, lo hice", "Lo intento"). Logo con degradado de azul a verde.
- **Navegación:** pestañas Hoy, Ruta, Notamos y Mis datos en una barra inferior de vidrio. Accesible: `role="tablist"`, flechas, Inicio/Fin y foco visible.
- Tipografía del sistema (sin webfonts), como pide la doctrina "liviano también es hermoso".

## Verificación

| Prueba | Resultado |
|---|---|
| Contraste WCAG AA, 15 pares × 2 temas (`app/src/ui/tema.test.ts`) | 30/30 ≥ 4,5:1 |
| Objetivos táctiles ≥ 44 px | Por CSS (`min-height: 44px` en botones y pestañas) |
| `prefers-reduced-motion` | La única transición (presionar un botón) solo existe con `no-preference` |
| Peso (build del piloto) | JS 16,5 KB, CSS 2,8 KB y HTML 3,0 KB (gzip) |

## Riesgos

- El contraste se mide contra `--superficie-solida`, que es una **aproximación** del vidrio translúcido sobre el cielo. Sobre las burbujas, el fondo real varía un poco.
- La parte superior de los botones (el reflejo) es más clara que su centro. El texto va centrado, sobre el color medido, y lleva una sombra para reforzarlo.
- `backdrop-filter` cuesta GPU en teléfonos de gama baja. Se mide en F5 (frame ≤ 16,7 ms); si no cumple, se reemplaza por un fondo semiopaco sin blur.

## Regla de benchmarks (> 5%)

El TTI de la app en el perfil de referencia pasó de **~1.225 ms** (F0, mediana de 15 corridas) a **~1.300 ms** (F4, una corrida de control): **≈ +6%**. Causa: el bundle inicial creció de 1,2 KB a 16,5 KB de JS (motor de patrones, M0, rutas y pestañas) más el CSS nuevo. **Justificación:** son las funciones del producto y el TTI sigue en 26% del presupuesto (5 s). **Pendiente para F5:** cargar en diferido el motor de patrones y las rutas (no se necesitan para el primer pintado de "Hoy") y medir de nuevo con 15 corridas.
