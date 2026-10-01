"""Arma la muestra de 100 notas sintéticas para probar la guía de etiquetado (criterio de F1).

Escribe dos archivos separados, para que quien etiqueta no vea la verdad:
  muestra_100.jsonl          id + texto (lo que se carga en la herramienta)
  muestra_100_generador.jsonl  etiquetas y tono que plantó el generador (anotador "generador")

La muestra sobrerrepresenta casos difíciles: notas cortas, multitema, sin tema y de personas
con mucho chilenismo o sin tildes.

Uso:  env PYTHONPATH=src uv run python etiquetado/muestra.py
"""

import json
import random
from pathlib import Path

from data.sintetico import generar

AQUI = Path(__file__).resolve().parent


def main() -> None:
    filas, efectos = generar(semilla=21, personas=40, dias=60)  # semilla distinta a la de entrenamiento
    notas = [f for f in filas if f["texto"]]
    estilos = {p: v["estilo"] for p, v in efectos["personas"].items()}
    rng = random.Random(7)

    cupos = [
        ("corta", 18, lambda f: len(f["texto"].split()) <= 4),
        ("multitema", 18, lambda f: len(f["etiquetas"]) >= 3),
        ("sin_tema", 8, lambda f: not f["etiquetas"]),
        ("chilenismo", 18, lambda f: estilos[f["persona"]]["p_chilenismo"] > 0.5),
        ("sin_tildes", 12, lambda f: estilos[f["persona"]]["p_sin_tildes"] > 0.7),
        ("cualquiera", 26, lambda f: True),
    ]
    elegidas, usados = [], set()
    for segmento, n, cond in cupos:
        pool = [f for f in notas if cond(f) and id(f) not in usados]
        for f in rng.sample(pool, n):
            usados.add(id(f))
            elegidas.append((segmento, f))
    rng.shuffle(elegidas)

    with open(AQUI / "muestra_100.jsonl", "w", encoding="utf-8") as m, \
         open(AQUI / "muestra_100_generador.jsonl", "w", encoding="utf-8") as g:
        for k, (segmento, f) in enumerate(elegidas):
            nid = f"m{k:03d}"
            m.write(json.dumps({"id": nid, "texto": f["texto"]}, ensure_ascii=False) + "\n")
            g.write(json.dumps({"id": nid, "anotador": "generador", "segmento": segmento,
                                "etiquetas": f["etiquetas"], "tono": f["tono"],
                                "ambigua": False, "riesgo": False}, ensure_ascii=False) + "\n")
    print(f"{len(elegidas)} notas → muestra_100.jsonl (+ verdad del generador aparte)")


if __name__ == "__main__":
    main()
