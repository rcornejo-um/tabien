# 001 — Dispositivo de referencia: perfil "web de referencia"

**Fecha:** 2026-09-30 · **Fase:** F0 · **Estado:** Aprobado (como decisión), con riesgo declarado

## Contexto

Los principios Dicarch exigen declarar un dispositivo de referencia (el aparato más modesto del público objetivo) y medir todo ahí, nunca en la máquina de desarrollo. La persona responsable del proyecto declaró el dispositivo de referencia como **"web"**: un navegador, sin un teléfono físico concreto.

## Decisión

El perfil **"web de referencia"** es:

| Parámetro | Valor | Origen |
|---|---|---|
| Navegador | Chromium (Brave, `/usr/bin/brave`), headless | Único Chromium instalado |
| CPU | **4× más lenta** (`Emulation.setCPUThrottlingRate`) | Elegido por la persona responsable (estándar de Lighthouse móvil) |
| Red | Slow 4G: 150 ms de RTT, 1,6 Mbps de bajada, 750 Kbps de subida | Perfil móvil de Lighthouse |
| Pantalla | 412×823, factor 1,75, móvil | Perfil móvil de Lighthouse |
| Medición de carga | Lighthouse 13 con `throttlingMethod: "devtools"` (freno aplicado de verdad, no simulado) | Aprobado como dependencia de desarrollo |
| Medición de inferencia | Script propio por CDP (`bench/`) | Lighthouse no corre benchmarks a medida |

## Riesgos (declarados, no resueltos)

1. **Sigue siendo la máquina de desarrollo** (i5-11400H, 12 hilos, 16 GB) con freno. El freno de CPU no emula la RAM escasa, el calentamiento térmico, el almacenamiento lento ni el JIT de un teléfono barato. Un teléfono real de gama baja puede ser bastante más lento que este perfil.
2. **El freno de CPU de Chromium puede no aplicarse a los Workers.** La inferencia corre en un Worker, así que esto se **mide** en el LT0 (H2) en vez de suponerlo.
3. Las mediciones varían entre corridas: se reportan medianas y percentiles de varias corridas, no una sola.

## Mitigación

- Todo resultado de rendimiento se informa como "en el perfil web de referencia", nunca como "en gama baja".
- `parking_lot.md` #7: contrastar con un Android real de gama baja en F5.
