"""Entrena M1 de mecánica (registry/v000), lo exporta y genera el conjunto de paridad.

v000 NO es publicable: está entrenado solo con D0 v0 sintético. Existe para el LT0-ML
(peso, latencia y paridad Python ↔ TS).

Uso:  env PYTHONPATH=src uv run python -m modelos.entrenar_m1
"""

import hashlib
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score
from sklearn.model_selection import GroupShuffleSplit

from data.sintetico_v0 import ETIQUETAS
from exportar.lineal import exportar, leer
from exportar.lt_h1 import cargar
from modelos.m1 import entrenar, predecir_proba

RAIZ = Path(__file__).resolve().parents[3]
BITS, DTYPE, C = 14, "int8", 4.0
VERSION = "v000"

# Casos borde que se suman al conjunto de paridad (además de las notas sintéticas).
BORDES = [
    "", "   ", "😴", "👍🏽", "!!!...", "ＨＯＬＡ", "x<3", "<<emo_feliz>>", "ñandú año pingüino",
    "caminé 10000 pasos 💪", "mi rut es 12.345.678-9 y mi cel +56 9 8765 4321",
    "nooooo dormí naaada 😩😩😩", "dormí 5hrs😴", "harta pega po cachai jaja",
    "a" * 300, "dormí mal " * 60,
]


def main() -> None:
    ruta_entr = RAIZ / "ml/data/generado/d0_v0_entrenamiento.jsonl"
    ruta_par = RAIZ / "ml/data/generado/d0_v0_paridad.jsonl"
    textos, Y, personas = cargar(ruta_entr)

    # Métrica de humo, por persona, SOBRE DATOS SINTÉTICOS (no es desempeño real).
    tr, va = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=0).split(textos, groups=personas))
    m_val = entrenar([textos[i] for i in tr], Y[tr], ETIQUETAS, BITS, C)
    pred = (predecir_proba(m_val, [textos[i] for i in va]) >= 0.5).astype(int)
    humo = {
        "advertencia": "Sobre D0 v0 sintético, división por persona. NO es desempeño real: el modelo aprende el generador.",
        "f1_micro": round(float(f1_score(Y[va], pred, average="micro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(Y[va], pred, average="macro", zero_division=0)), 4),
    }

    modelo = entrenar(textos, Y, ETIQUETAS, BITS, C)
    carpeta = RAIZ / "ml/registry" / VERSION
    manifiesto = exportar(modelo, DTYPE, carpeta, {
        "version": VERSION,
        "publicable": False,
        "motivo_no_publicable": "Entrenado solo con D0 v0 sintético. Existe para el LT0-ML (mecánica), no para personas.",
        "umbrales": [0.5] * len(ETIQUETAS),
        "umbrales_nota": "Provisorios. En F2 se ajustan por etiqueta en validación.",
        "entrenamiento": {
            "modelo": "M1: TF-IDF hasheado (palabras + n-gramas 2–5) + OneVsRest(LogisticRegression liblinear)",
            "C": C, "notas": len(textos), "personas": len(set(personas)),
        },
        "dataset": {
            "manifiesto": "ml/data/manifiestos/d0_v0.json",
            "sha256": hashlib.sha256(ruta_entr.read_bytes()).hexdigest(),
        },
        "metricas_humo": humo,
        "creado": "2026-09-30",
    })

    # Conjunto de paridad: probabilidades con los pesos EXPORTADOS (descuantizados).
    exportado = leer(carpeta)
    textos_par = [json.loads(l)["texto"] for l in ruta_par.read_text(encoding="utf-8").splitlines()] + BORDES
    probs = predecir_proba(exportado, textos_par)
    (carpeta / "paridad.json").write_text(json.dumps({
        "version_modelo": VERSION,
        "pipeline_version": manifiesto["pipeline_version"],
        "tolerancia": 1e-5,
        "casos": [{"texto": t, "probs": [float(x) for x in p]} for t, p in zip(textos_par, probs)],
    }, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{VERSION}: {manifiesto['bytes']} bytes, {BITS} bits, {DTYPE}; paridad: {len(textos_par)} casos")
    print(f"Humo (sintético, NO real): {humo['f1_micro']=} {humo['f1_macro']=}")


if __name__ == "__main__":
    main()
