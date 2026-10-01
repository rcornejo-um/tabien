"""Datos de ejemplo para PROBAR la app (no para evaluar): una persona inventada con efectos fuertes.

Se elige, entre varias semillas, una persona cuyo historial muestre hallazgos claros. Eso es
selección a propósito: sirve para ver la pantalla funcionando, no dice nada del desempeño.

Uso:  env PYTHONPATH=src:. uv run python -m data.demo
"""

import json
import random
from dataclasses import replace
from datetime import date
from pathlib import Path

from data import sintetico as S
from patrones import CONFIG, analizar
from patrones.evaluar import tabla

SALIDA = Path(__file__).resolve().parents[2] / "app" / "public" / "demo" / "persona-demo.json"
DIAS = 60


def candidata(semilla: int):
    rng = random.Random(semilla)
    p = S._crear_persona(rng, 0, semilla)
    p = replace(
        p,
        efectos={"estres_sueno": -1.0, "ejercicio_tono": 1.0, "pantallas_sueno": -1.0},
        estilo=replace(p.estilo, p_nota=0.95, p_numeros=0.95, frases_max=3, p_typo=0.03, p_mayus=0.0),
        p_pantallas=0.45, p_ejercicio=0.4,
    )
    filas = S._simular_persona(p, DIAS, date(2026, 1, 5), random.Random(semilla + 1))
    config = dict(CONFIG, y=[y for y in CONFIG["y"] if y != "tono"])
    return filas, analizar(tabla(filas), config)


def main() -> None:
    mejor = None
    for semilla in range(200):
        filas, r = candidata(semilla)
        pares = {(h["x"], h["y"]) for h in r["hallazgos"]}
        puntaje = len(pares) + 3 * (("estres", "sueno_horas") in pares) + 2 * (("pantallas", "sueno_horas") in pares)
        if mejor is None or puntaje > mejor[0]:
            mejor = (puntaje, semilla, filas, r)
    _, semilla, filas, r = mejor
    dias = [{
        "dias_atras": DIAS - f["dia"],
        "texto": f["texto"],
        "suenoHoras": f["sueno_horas_ingresado"],
        "pasos": f["pasos_ingresado"],
        "vasosAgua": f["vasos_agua_ingresado"],
    } for f in filas if f["texto"] or f["sueno_horas_ingresado"] is not None]
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps({
        "descripcion": "Persona INVENTADA (generador sintetico-v2.1) para probar la app. No es una persona real.",
        "semilla": semilla, "dias": dias}, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"semilla {semilla}: {len(dias)} días; hallazgos (con etiquetas del generador):")
    for h in r["hallazgos"]:
        print(f"  {h['x']} → {h['y']} ρ={h['rho']:.2f} q={h['q']:.3g}")


if __name__ == "__main__":
    main()
