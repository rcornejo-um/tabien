# Tabien — contexto permanente para el agente

Sistema **local-first** que entiende la nota diaria que una persona escribe ("dormí pésimo, harta pega 😩") y le propone rutas de hábitos. Proyecto **Dicarch**. Idioma de documentos, UI y comentarios: **es-CL**.

Fuente canónica de principios: `docs/principios-dicarch.md` (manda sobre este archivo en caso de conflicto).

## Reglas de trabajo (vinculantes)

1. **Fases con checkpoint** (F0…F6). Al cerrar una fase se entrega: qué se hizo, resultados con números (Aprobado/Parcial/Fallido), decisiones, riesgos, preguntas y plan siguiente. **No se avanza sin confirmación explícita.**
2. **Toda hipótesis se prueba** con un Limit Test y se registra en `decisions/NNN-titulo.md`: Hipótesis → Método → Resultado (números) → Aprendizaje → Estado.
3. **Honestidad:** métricas de comprensión de texto sobre datos sintéticos **no son desempeño real**. Decirlo siempre.
4. **Dependencias nuevas: preguntar antes** (también las de desarrollo).
5. Lo que no es de la fase actual va a `parking_lot.md`.

## Dispositivo de referencia

Perfil **"web de referencia"** (ver `decisions/001`): Chromium (Brave) con **CPU 4× más lenta**, red **Slow 4G** (150 ms RTT, 1,6 Mbps) y viewport móvil. Es una emulación sobre la máquina de desarrollo; se reporta así.

Presupuestos: JS inicial ≤ 100 KB gzip · ruta crítica ≤ 150 KB · carga inicial ≤ 500 KB · TTI ≤ 5 s · interacción ≤ 100 ms · frame ≤ 16 ms. Los pesos del modelo cuentan y se cargan en diferido.

## Arquitectura

- `app/` (TypeScript strict, Vite, vanilla DOM + Canvas). `app/src/core` y `app/src/ml` **nunca tocan el DOM**. Inferencia en TS puro sobre `Float32Array`, en un Worker, sin runtimes de terceros.
- `ml/` taller en Python 3.12 (uv): entrenamiento, evaluación y exportación a `ml/registry/vNNN/{weights.bin, manifest.json}`. **Nunca** corre en el dispositivo.
- `spec/texto.md` + `spec/fixtures/` = contrato del pipeline de texto. Python y TS corren los mismos fixtures. **Paridad Python ↔ TS obligatoria** (tolerancia 1e-5).
- Un modelo con `pipeline_version` distinta a la del runtime **no se carga**. Un modelo con `"publicable": false` no va al producto.

## Límites no negociables

- Ningún dato sale del dispositivo sin consentimiento explícito por acción. Anonimizar antes de cualquier exportación.
- Capa de **riesgo** (solo reglas, léxico revisado por una persona) corre antes que todo; si se activa: recursos de ayuda, cero hábitos/rutas/rachas ese día.
- Catálogo de hábitos sin restricción calórica, ayuno, metas de peso ni conteo de calorías. Todo hábito con fuente.
- Lenguaje **no causal y no clínico** ("cuando pasa X, suele pasar Y").
- Evaluación: **división por persona** (GroupKFold), retención temporal, bóveda congelada que no se mira para decidir, IC 95% por bootstrap.

## Comandos

```fish
# TS (desde la raíz)
npm test                 # vitest: fixtures del contrato + paridad
npm run typecheck
npm run build            # app de prueba (H4)
npm run bench:inferencia # H2 en el perfil de referencia
npm run bench:tti        # H4 con Lighthouse

# Python (desde ml/)
uv run pytest
env PYTHONPATH=src uv run python -m modelos.entrenar_m1
```
