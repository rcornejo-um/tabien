"""LT0-ML · H1: ¿un M1 exportado pesa ≤ 300 KB gzip?

Grilla: bits de cubeta (12…16) × dtype (float32, float16, int8). Para cada celda:
- tamaño real de weights.bin, con gzip nivel 6 (lo típico de un servidor) y nivel 9;
- cuánto cambian las probabilidades al cuantizar (máx |Δp| contra float32);
- F1 micro/macro en validación por persona, **sobre datos sintéticos** (solo para ver que
  cuantizar no destruye el modelo; NO es desempeño real).

Uso:  env PYTHONPATH=src uv run python -m exportar.lt_h1
"""

import gzip
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score
from sklearn.model_selection import GroupShuffleSplit

from data.sintetico_v0 import ETIQUETAS
from exportar.lineal import DTYPES, cuantizar, descuantizar, serializar
from modelos.m1 import ModeloLineal, entrenar, predecir_proba

RAIZ = Path(__file__).resolve().parents[3]
LIMITE_GZIP = 300 * 1024


def cargar(ruta: Path) -> tuple[list[str], np.ndarray, list[str]]:
    filas = [json.loads(l) for l in ruta.read_text(encoding="utf-8").splitlines()]
    textos = [f["texto"] for f in filas]
    Y = np.array([[e in f["etiquetas"] for e in ETIQUETAS] for f in filas], dtype=np.int8)
    return textos, Y, [f["persona"] for f in filas]


def main() -> None:
    textos, Y, personas = cargar(RAIZ / "ml/data/generado/d0_v0_entrenamiento.jsonl")
    # División por PERSONA (nunca por fila), aunque sea sintético: el hábito se forma desde F0.
    tr, va = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=0).split(textos, groups=personas))
    t_tr, t_va = [textos[i] for i in tr], [textos[i] for i in va]

    filas = []
    for bits in range(12, 17):
        m = entrenar(t_tr, Y[tr], ETIQUETAS, bits)
        p32 = predecir_proba(m, t_va)
        ocupacion = float((np.abs(m.W).max(axis=1) > 0).mean())
        # Peor caso: todas las cubetas usadas (como con notas reales y vocabulario abierto).
        # Pesos densos aleatorios con la misma escala por etiqueta → gzip casi no comprime.
        rng = np.random.default_rng(bits)
        escala = np.abs(m.W).max(axis=0) / 3.0
        W_denso = (rng.standard_normal(m.W.shape) * escala).astype(np.float32)
        m_denso = ModeloLineal(m.bits, m.etiquetas, m.idf, W_denso, m.b)
        for dtype in DTYPES:
            binario, _ = serializar(m, dtype)
            binario_denso, _ = serializar(m_denso, dtype)
            q, escalas = cuantizar(m.W, dtype)
            mq = ModeloLineal(m.bits, m.etiquetas, m.idf, descuantizar(q, escalas), m.b)
            p = predecir_proba(mq, t_va)
            pred = (p >= 0.5).astype(int)
            filas.append({
                "bits": bits, "dtype": dtype, "bytes": len(binario),
                "gzip6": len(gzip.compress(binario, 6)), "gzip9": len(gzip.compress(binario, 9)),
                "ocupacion_cubetas": ocupacion,
                "gzip6_peor_caso_denso": len(gzip.compress(binario_denso, 6)),
                "max_delta_p": float(np.abs(p - p32).max()),
                "f1_micro_sintetico": float(f1_score(Y[va], pred, average="micro", zero_division=0)),
                "f1_macro_sintetico": float(f1_score(Y[va], pred, average="macro", zero_division=0)),
            })

    salida = RAIZ / "bench/resultados/h1.json"
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps({
        "hipotesis": "H1: M1 exportado ≤ 300 KB gzip",
        "limite_bytes": LIMITE_GZIP,
        "advertencia": "F1 sobre D0 v0 sintético: solo verifica que cuantizar no rompe el modelo. NO es desempeño real.",
        "notas_entrenamiento": len(tr), "notas_validacion": len(va),
        "grilla": filas,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"{'bits':>4} {'dtype':>7} {'bytes':>9} {'ocup':>5} {'gzip6':>8} {'≤300':>5} {'gz6 denso':>10} {'≤300':>5} {'máx|Δp|':>8} {'F1mac*':>7}")
    for f in filas:
        ok = "sí" if f["gzip6"] <= LIMITE_GZIP else "no"
        ok_d = "sí" if f["gzip6_peor_caso_denso"] <= LIMITE_GZIP else "no"
        print(f"{f['bits']:>4} {f['dtype']:>7} {f['bytes']:>9} {f['ocupacion_cubetas']:>5.0%} {f['gzip6']:>8} {ok:>5} "
              f"{f['gzip6_peor_caso_denso']:>10} {ok_d:>5} {f['max_delta_p']:>8.5f} {f['f1_macro_sintetico']:>7.3f}")
    print("* F1 sobre datos sintéticos: no es desempeño real.")


if __name__ == "__main__":
    main()
