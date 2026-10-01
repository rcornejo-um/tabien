"""Acuerdo entre dos anotadores: kappa de Cohen por etiqueta y kappa ponderado para el tono.

Regla (docs/guia-etiquetado.md): una etiqueta con kappa < 0,6 tiene una definición ambigua.
Se reescribe la guía o se fusiona la etiqueta; no se entrena sobre ella.

Uso:
    env PYTHONPATH=src uv run python -m evaluacion.acuerdo A.jsonl B.jsonl [--salida reporte.json]
"""

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import cohen_kappa_score

ETIQUETAS = [
    "sueno", "estres", "alimentacion", "ejercicio", "animo",
    "social", "estudio_trabajo", "pantallas", "hidratacion", "descanso",
]
UMBRAL_KAPPA = 0.6


def cargar(ruta: Path) -> dict[str, dict]:
    return {
        (f := json.loads(l))["id"]: f
        for l in ruta.read_text(encoding="utf-8").splitlines() if l.strip()
    }


def _kappa(a: np.ndarray, b: np.ndarray, **kw) -> float | None:
    # Si ambos anotadores dan siempre el mismo valor, kappa no está definido.
    if len(set(a.tolist()) | set(b.tolist())) < 2:
        return None
    return float(cohen_kappa_score(a, b, **kw))


def acuerdo(a: dict[str, dict], b: dict[str, dict]) -> dict:
    comunes = sorted(set(a) & set(b))
    excluidas = [i for i in comunes if a[i].get("riesgo") or b[i].get("riesgo")]
    ids = [i for i in comunes if i not in excluidas]
    por_etiqueta = {}
    for e in ETIQUETAS:
        xa = np.array([e in a[i]["etiquetas"] for i in ids], dtype=int)
        xb = np.array([e in b[i]["etiquetas"] for i in ids], dtype=int)
        k = _kappa(xa, xb)
        por_etiqueta[e] = {
            "kappa": None if k is None else round(k, 3),
            "acuerdo_simple": round(float((xa == xb).mean()), 3) if ids else None,
            "positivos_a": int(xa.sum()),
            "positivos_b": int(xb.sum()),
            "solo_a": [i for i, x, y in zip(ids, xa, xb) if x and not y],
            "solo_b": [i for i, x, y in zip(ids, xa, xb) if y and not x],
            "bajo_umbral": k is not None and k < UMBRAL_KAPPA,
        }
    con_tono = [i for i in ids if a[i].get("tono") is not None and b[i].get("tono") is not None]
    ta = np.array([a[i]["tono"] for i in con_tono])
    tb = np.array([b[i]["tono"] for i in con_tono])
    k_tono = _kappa(ta, tb, weights="quadratic")
    return {
        "notas_comunes": len(comunes),
        "notas_evaluadas": len(ids),
        "excluidas_por_riesgo": excluidas,
        "umbral_kappa": UMBRAL_KAPPA,
        "por_etiqueta": por_etiqueta,
        "tono": {
            "kappa_ponderado_cuadratico": None if k_tono is None else round(k_tono, 3),
            "acuerdo_exacto": round(float((ta == tb).mean()), 3) if len(con_tono) else None,
            "mae": round(float(np.abs(ta - tb).mean()), 3) if len(con_tono) else None,
        },
        "etiquetas_bajo_umbral": [e for e, v in por_etiqueta.items() if v["bajo_umbral"]],
    }


def imprimir(r: dict) -> None:
    print(f"Notas evaluadas: {r['notas_evaluadas']} (excluidas por riesgo: {len(r['excluidas_por_riesgo'])})")
    print(f"{'etiqueta':<16} {'kappa':>6} {'acuerdo':>8} {'pos A':>6} {'pos B':>6}")
    for e, v in r["por_etiqueta"].items():
        k = "n/d" if v["kappa"] is None else f"{v['kappa']:.2f}"
        marca = "  ← < 0,6" if v["bajo_umbral"] else ""
        print(f"{e:<16} {k:>6} {v['acuerdo_simple']:>8.2f} {v['positivos_a']:>6} {v['positivos_b']:>6}{marca}")
    t = r["tono"]
    print(f"tono: kappa ponderado {t['kappa_ponderado_cuadratico']}, acuerdo exacto {t['acuerdo_exacto']}, MAE {t['mae']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("a", type=Path)
    ap.add_argument("b", type=Path)
    ap.add_argument("--salida", type=Path)
    args = ap.parse_args()
    r = acuerdo(cargar(args.a), cargar(args.b))
    imprimir(r)
    if args.salida:
        args.salida.write_text(json.dumps(r, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
