"""Simulador fuera de línea de rutas: política v1 (reglas) vs. bandit v2 (Thompson). Criterio F4.

Cada persona simulada (rasgos de D0) tiene preferencias OCULTAS por hábito:
  p_acepta(h)  = σ(0,8 + afinidad[área] − 0,6·(dificultad − 1))
  p_cumple(h)  = σ(0,3 + 0,8·afinidad[área] − 0,7·(dificultad − 1))       (por día)
  afinidad[área] = efecto de sus rasgos + componente personal N(0, 1) que ninguna política ve.
Recompensa semanal (§6.7): aceptó Y cumplió ≥ 4 de 7 días.
Arrepentimiento (pseudo-regret) por semana = recompensa esperada del mejor hábito elegible − la del
hábito elegido. Ambas políticas ven el mismo "contexto": el área que sugieren sus datos.

El bandit corre POR PERSONA (local-first: aprende solo de esa persona) y explora solo dentro del
catálogo (que ya pasó los guardarraíles).

Uso:  env PYTHONPATH=src:. uv run python -m rutas.simulador [--personas 300] [--semanas 26]
"""

import argparse
import json
import math
import random
from pathlib import Path

from data import sintetico as S
from rutas.catalogo import CATALOGO

RAIZ = Path(__file__).resolve().parents[3]
HAB = {h["id"]: h for h in CATALOGO["habitos"]}
AREAS = {a: v["pasos"] for a, v in CATALOGO["areas"].items()}
DIFICULTAD: dict[str, list[int]] = {"v1": [], "bandit": []}  # dificultad de lo propuesto, para el reporte


def sig(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def p_al_menos(k: int, n: int, p: float) -> float:
    return sum(math.comb(n, i) * p**i * (1 - p) ** (n - i) for i in range(k, n + 1))


class Persona:
    def __init__(self, base: S.Persona, rng: random.Random):
        rasgo = {
            "movimiento": 2 * (base.p_ejercicio - 0.35),
            "pantallas": -2 * (base.p_pantallas - 0.35),
            "pausas": 0.5 * base.base_estres,
            "sueno": 0.3 * (7 - base.base_sueno),
            "agua": 0.2 * (base.media_agua - 5) / 2,
            "comida": 0.0,
        }
        self.afinidad = {a: rasgo[a] + rng.gauss(0, 1) for a in AREAS}
        # Contexto observable: lo que "sugieren sus datos" (proxy de los hallazgos del motor).
        necesidad = {"pausas": base.base_estres, "pantallas": base.p_pantallas - 0.35,
                     "sueno": 7 - base.base_sueno, "movimiento": 0.35 - base.p_ejercicio, "agua": (5 - base.media_agua) / 4}
        self.candidatas = sorted(necesidad, key=lambda a: -necesidad[a]) + ["comida"]

    def p_acepta(self, h: str) -> float:
        x = HAB[h]
        return sig(0.8 + self.afinidad[x["area"]] - 0.6 * (x["dificultad"] - 1))

    def p_cumple(self, h: str) -> float:
        x = HAB[h]
        return sig(0.3 + 0.8 * self.afinidad[x["area"]] - 0.7 * (x["dificultad"] - 1))

    def esperada(self, h: str) -> float:
        return self.p_acepta(h) * p_al_menos(4, 7, self.p_cumple(h))

    def semana(self, h: str, rng: random.Random) -> tuple[bool, int]:
        if rng.random() >= self.p_acepta(h):
            return False, 0
        return True, sum(rng.random() < self.p_cumple(h) for _ in range(7))


def elegibles(completados: set[str]) -> list[str]:
    return [h for h, x in HAB.items() if h not in completados and all(p in completados for p in x["prerrequisitos"])]


def mas_facil(area: str, completados: set[str]) -> str | None:
    ops = [h for h in AREAS[area] if h in elegibles(completados)]
    return min(ops, key=lambda h: HAB[h]["dificultad"]) if ops else None


def correr_v1(p: Persona, semanas: int, rng: random.Random) -> tuple[float, float]:
    completados: set[str] = set()
    vetadas: dict[str, int] = {}  # área → semana del veto ("no aplica" dura 30 días ≈ 4 semanas, como en la app)
    activo = None
    regret = recompensa = 0.0
    for semana in range(semanas):
        if activo is None:
            for a in p.candidatas:
                if semana - vetadas.get(a, -99) >= 4 and (h := mas_facil(a, completados)):
                    activo = h
                    break
        ops = elegibles(completados)
        if not ops:
            break
        mejor = max(p.esperada(h) for h in ops)
        if activo is not None:
            DIFICULTAD["v1"].append(HAB[activo]["dificultad"])
        if activo is None:  # no propone nada: la persona no recibe nada esa semana
            regret += mejor
            continue
        regret += mejor - p.esperada(activo)
        acepta, dias = p.semana(activo, rng)
        recompensa += acepta and dias >= 4
        if not acepta:  # "no aplica" / no lo intenta → cambia de área
            vetadas[HAB[activo]["area"]] = semana
            activo = None
        elif dias >= 5:  # ≥ 70% → avanza
            completados.add(activo)
            activo = mas_facil(HAB[activo]["area"], completados)
        elif dias <= 2:  # < 40% → más fácil (o el mismo, una semana más)
            ruta = AREAS[HAB[activo]["area"]]
            i = ruta.index(activo)
            if i > 0 and HAB[ruta[i - 1]]["dificultad"] < HAB[activo]["dificultad"]:
                completados.discard(ruta[i - 1])
                activo = ruta[i - 1]
    return regret, recompensa


def correr_bandit(p: Persona, semanas: int, rng: random.Random, prior_contexto: float = 1.0) -> tuple[float, float]:
    completados: set[str] = set()
    alfa = {h: 1.0 for h in HAB}
    beta = {h: 1.0 for h in HAB}
    for orden, a in enumerate(p.candidatas[:2]):  # contexto: las 2 áreas que sugieren sus datos
        for h in AREAS[a]:
            alfa[h] += prior_contexto / (orden + 1)
    regret = recompensa = 0.0
    for _ in range(semanas):
        ops = elegibles(completados)
        if not ops:
            break
        h = max(ops, key=lambda x: rng.betavariate(alfa[x], beta[x]))
        DIFICULTAD["bandit"].append(HAB[h]["dificultad"])
        regret += max(p.esperada(x) for x in ops) - p.esperada(h)
        acepta, dias = p.semana(h, rng)
        r = acepta and dias >= 4
        recompensa += r
        alfa[h] += r
        beta[h] += 1 - r
        if acepta and dias >= 5:
            completados.add(h)
    return regret, recompensa


def bootstrap_ic(dif: list[float], rng: random.Random, n: int = 4000) -> tuple[float, float]:
    medias = sorted(sum(rng.choice(dif) for _ in dif) / len(dif) for _ in range(n))
    return medias[int(0.025 * n)], medias[int(0.975 * n)]


def main(personas: int, semanas: int, semilla: int) -> dict:
    rng = random.Random(semilla)
    base = [S._crear_persona(rng, i, semilla) for i in range(personas)]
    gente = [Persona(b, random.Random(semilla * 7919 + i)) for i, b in enumerate(base)]
    res = {"v1": [], "bandit": []}
    for i, p in enumerate(gente):
        res["v1"].append(correr_v1(p, semanas, random.Random(i)))
        res["bandit"].append(correr_bandit(p, semanas, random.Random(i)))
    dif = [a[0] - b[0] for a, b in zip(res["v1"], res["bandit"])]  # > 0: el bandit se arrepiente menos
    lo, hi = bootstrap_ic(dif, random.Random(semilla + 1))
    dif_r = [b[1] - a[1] for a, b in zip(res["v1"], res["bandit"])]  # > 0: el bandit logra más semanas
    lo_r, hi_r = bootstrap_ic(dif_r, random.Random(semilla + 2))
    resumen = {
        "personas": personas, "semanas": semanas, "semilla": semilla,
        "regret_medio_v1": round(sum(r for r, _ in res["v1"]) / personas, 3),
        "regret_medio_bandit": round(sum(r for r, _ in res["bandit"]) / personas, 3),
        "recompensa_media_v1": round(sum(x for _, x in res["v1"]) / personas, 2),
        "recompensa_media_bandit": round(sum(x for _, x in res["bandit"]) / personas, 2),
        "diferencia_regret_v1_menos_bandit": round(sum(dif) / personas, 3),
        "ic95": [round(lo, 3), round(hi, 3)],
        "diferencia_recompensa_bandit_menos_v1": round(sum(dif_r) / personas, 3),
        "ic95_recompensa": [round(lo_r, 3), round(hi_r, 3)],
        "dificultad_media_v1": round(sum(DIFICULTAD["v1"]) / max(1, len(DIFICULTAD["v1"])), 2),
        "dificultad_media_bandit": round(sum(DIFICULTAD["bandit"]) / max(1, len(DIFICULTAD["bandit"])), 2),
    }
    resumen["bandit_mejor"] = lo > 0
    return resumen


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--personas", type=int, default=300)
    ap.add_argument("--semanas", type=int, default=26)
    ap.add_argument("--semilla", type=int, default=51)
    ap.add_argument("--salida", type=Path)
    a = ap.parse_args()
    r = main(a.personas, a.semanas, a.semilla)
    print(json.dumps(r, ensure_ascii=False, indent=1))
    if a.salida:
        a.salida.write_text(json.dumps(r, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
