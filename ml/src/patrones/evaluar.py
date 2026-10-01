"""Evaluación del motor de patrones con D0 (criterio de F3).

Verdad de fondo (decisions/007): para cada persona se simulan 3.000 días con SUS mismos
parámetros y se calcula ρ de cada par observable (x, y, desfase). Un par está "asociado" si
|ρ_largo| ≥ 0,1, sea la asociación directa o indirecta (los hallazgos no son causales).

- Sensibilidad: fracción de efectos plantados (moderados / fuertes) detectados, con el par
  observable correspondiente (estres→sueno_horas, ejercicio→tono, pantallas→sueno_horas).
- Tasa de falsos descubrimientos: hallazgos cuyo par NO está asociado / total de hallazgos.
- Regla de 14 días: con 13 días de datos no debe haber ningún hallazgo.

Uso:  env PYTHONPATH=src:. uv run python -m patrones.evaluar --semilla 31 [--dias 60] [--ruido 0.1]
"""

import argparse
import json
import random
from dataclasses import replace
from datetime import date
from pathlib import Path

from data import sintetico as S
from patrones import CONFIG, analizar, spearman

RAIZ = Path(__file__).resolve().parents[3]
UMBRAL_ASOCIADO = 0.1
DIAS_LARGOS = 3000
OBJETIVOS = {  # efecto plantado → par observable y su desfase
    "estres_sueno": ("estres", "sueno_horas", 1),
    "ejercicio_tono": ("ejercicio", "tono", 0),
    "pantallas_sueno": ("pantallas", "sueno_horas", 1),
}
TEMAS = [v for v in CONFIG["x"] if CONFIG["variables"][v]["tipo"] == "tema"]


def personas(semilla: int, n: int) -> list[S.Persona]:
    rng = random.Random(semilla)
    return [S._crear_persona(rng, i, semilla) for i in range(n)]


def tabla(filas: list[dict], ruido: float = 0.0, rng: random.Random | None = None, completo: bool = False) -> list[dict]:
    """Filas de D0 → entrada del motor. `ruido`: prob. de invertir cada tema (T1 imperfecto)."""
    salida = []
    for f in filas:
        hay_nota = f["texto"] is not None
        v = {}
        for t in TEMAS:
            if not hay_nota:
                v[t] = None
                continue
            val = int(t in f["etiquetas"])
            if ruido and rng and rng.random() < ruido:
                val = 1 - val
            v[t] = val
        sufijo = "" if completo else "_ingresado"
        v["sueno_horas"] = f["sueno_horas" + sufijo]
        v["pasos"] = f["pasos" + sufijo]
        v["vasos_agua"] = f["vasos_agua" + sufijo]
        v["tono"] = f["tono"] if hay_nota else None
        salida.append({"dia": f["dia"], "valores": v})
    return salida


def verdad_larga(p: S.Persona, semilla: int) -> dict[tuple[str, str, int], float]:
    larga = replace(p, estilo=replace(p.estilo, p_nota=1.0, p_numeros=1.0))
    filas = S._simular_persona(larga, DIAS_LARGOS, date(2026, 1, 5), random.Random(semilla))
    t = {d["dia"]: d["valores"] for d in tabla(filas, completo=True)}
    rhos = {}
    for x in CONFIG["x"]:
        for y in CONFIG["y"]:
            if x == y:
                continue
            for L in [CONFIG["desfase_por_y"][y]]:
                xs, ys = [], []
                for d in range(DIAS_LARGOS - L):
                    vx, vy = t[d].get(x), t[d + L].get(y)
                    if vx is not None and vy is not None:
                        xs.append(float(vx))
                        ys.append(float(vy))
                rhos[(x, y, L)] = spearman(xs, ys) if len(set(xs)) > 1 and len(set(ys)) > 1 else 0.0
    return rhos


def evaluar(semilla: int, n_personas: int, dias: int, ruido: float, sin_tono: bool) -> dict:
    gente = personas(semilla, n_personas)
    filas, efectos = S.generar(semilla=semilla, personas=n_personas, dias=dias)
    por_persona: dict[str, list[dict]] = {}
    for f in filas:
        por_persona.setdefault(f["persona"], []).append(f)
    rng = random.Random(semilla + 1000)
    config = dict(CONFIG)
    if sin_tono:
        config["y"] = [y for y in CONFIG["y"] if y != "tono"]

    hallazgos_tot = falsos = 0
    deteccion = {k: {"moderado": [0, 0], "fuerte": [0, 0], "desfase_correcto": 0} for k in OBJETIVOS}
    falsos_detalle: dict[str, int] = {}
    regla_14_violada = 0
    for k, p in enumerate(gente):
        t = tabla(por_persona[p.id], ruido, rng)
        r = analizar(t, config)
        verdad = verdad_larga(p, semilla * 10_000 + k)
        for h in r["hallazgos"]:
            hallazgos_tot += 1
            if abs(verdad[(h["x"], h["y"], h["desfase"])]) < UMBRAL_ASOCIADO:
                falsos += 1
                clave = f"{h['x']}→{h['y']}@{h['desfase']}"
                falsos_detalle[clave] = falsos_detalle.get(clave, 0) + 1
        for efecto, (x, y, L) in OBJETIVOS.items():
            if sin_tono and y == "tono":
                continue
            beta = p.efectos[efecto]
            if beta == 0:
                continue
            nivel = "moderado" if abs(beta) == 0.5 else "fuerte"
            encontrado = [h for h in r["hallazgos"] if (h["x"], h["y"]) == (x, y)]
            deteccion[efecto][nivel][1] += 1
            if encontrado:
                deteccion[efecto][nivel][0] += 1
                deteccion[efecto]["desfase_correcto"] += int(encontrado[0]["desfase"] == L)
        # Regla de 14 días: solo los primeros días con datos hasta tener 13.
        con_datos = [d for d in t if any(v is not None for v in d["valores"].values())][:13]
        regla_14_violada += int(bool(analizar(con_datos, config)["hallazgos"]))

    def tasa(a): return None if a[1] == 0 else round(a[0] / a[1], 3)
    mod = [sum(deteccion[e]["moderado"][i] for e in deteccion) for i in (0, 1)]
    fue = [sum(deteccion[e]["fuerte"][i] for e in deteccion) for i in (0, 1)]
    return {
        "semilla": semilla, "personas": n_personas, "dias": dias, "ruido_temas": ruido, "sin_tono": sin_tono,
        "hallazgos": hallazgos_tot, "falsos": falsos,
        "fdr": round(falsos / hallazgos_tot, 3) if hallazgos_tot else 0.0,
        "sensibilidad_moderada": tasa(mod), "n_moderados": mod[1],
        "sensibilidad_fuerte": tasa(fue), "n_fuertes": fue[1],
        "por_efecto": {e: {"moderado": tasa(v["moderado"]), "fuerte": tasa(v["fuerte"]),
                           "n_mod": v["moderado"][1], "n_fue": v["fuerte"][1]} for e, v in deteccion.items()},
        "falsos_por_par": dict(sorted(falsos_detalle.items(), key=lambda kv: -kv[1])),
        "personas_con_hallazgo_antes_de_14_dias": regla_14_violada,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--semilla", type=int, default=11)
    ap.add_argument("--personas", type=int, default=40)
    ap.add_argument("--dias", type=int, default=60)
    ap.add_argument("--ruido", type=float, default=0.0)
    ap.add_argument("--sin-tono", action="store_true")
    ap.add_argument("--salida", type=Path)
    a = ap.parse_args()
    r = evaluar(a.semilla, a.personas, a.dias, a.ruido, a.sin_tono)
    print(json.dumps(r, ensure_ascii=False, indent=1))
    if a.salida:
        a.salida.parent.mkdir(parents=True, exist_ok=True)
        a.salida.write_text(json.dumps(r, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def potencia(rhos=(0.2, 0.3, 0.4, 0.5, 0.6), dias=(30, 60, 90, 120), sims=150, semilla=0) -> dict:
    """Sensibilidad del motor en función de la fuerza observable (ρ) y de los días de datos.

    Persona sintética "de laboratorio": 8 temas al azar (nota el 80% de los días), sueño/pasos/agua
    (ingresados el 70% de los días) y UNA asociación plantada directamente en lo observable:
    estres(t) → sueno_horas(t+1) con correlación ≈ ρ. Todo lo demás es independiente.
    """
    import math as m
    rng = random.Random(semilla)
    tabla_pot = {}
    for rho in rhos:
        for n in dias:
            det = fal = tot = 0
            for _ in range(sims):
                estres = [int(rng.random() < 0.4) for _ in range(n)]
                z = [(e - 0.4) / m.sqrt(0.24) for e in estres]
                filas = []
                for d in range(n):
                    nota = rng.random() < 0.8
                    num = rng.random() < 0.7
                    prev = z[d - 1] if d > 0 else 0.0
                    sueno = 7 + 0.8 * (-rho * prev + m.sqrt(1 - rho * rho) * rng.gauss(0, 1))
                    v = {t: (int(rng.random() < 0.3) if nota else None) for t in TEMAS}
                    v["estres"] = estres[d] if nota else None
                    v["sueno_horas"] = round(sueno, 1) if num else None
                    v["pasos"] = rng.randint(2000, 12000) if num else None
                    v["vasos_agua"] = rng.randint(1, 10) if num else None
                    v["tono"] = None
                    filas.append({"dia": d, "valores": v})
                r = analizar(filas)
                for h in r["hallazgos"]:
                    tot += 1
                    if (h["x"], h["y"]) == ("estres", "sueno_horas"):
                        det += 1
                    else:
                        fal += 1
            tabla_pot[f"rho={rho} dias={n}"] = {"sensibilidad": round(det / sims, 3),
                                                "fdr": round(fal / tot, 3) if tot else 0.0}
    return tabla_pot
