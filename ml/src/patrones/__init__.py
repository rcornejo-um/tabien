"""Motor de patrones `patrones-v1` (referencia en Python). Contrato: spec/patrones.md.

Sin scipy a propósito: la versión TS replica estas mismas funciones (rangos, beta incompleta,
Benjamini-Hochberg) y así la paridad es exacta. Los tests comparan contra scipy.
"""

import json
import math
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[3]
CONFIG = json.loads((_RAIZ / "spec" / "patrones" / "config-v1.json").read_text(encoding="utf-8"))
VERSION = CONFIG["version"]


# ----------------------------- estadística ---------------------------------------------------

def rangos(v: list[float]) -> list[float]:
    orden = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(orden):
        j = i
        while j + 1 < len(orden) and v[orden[j + 1]] == v[orden[i]]:
            j += 1
        promedio = (i + j) / 2 + 1
        for k in range(i, j + 1):
            r[orden[k]] = promedio
        i = j + 1
    return r


def pearson(a: list[float], b: list[float]) -> float:
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    sab = saa = sbb = 0.0
    for x, y in zip(a, b):
        sab += (x - ma) * (y - mb)
        saa += (x - ma) ** 2
        sbb += (y - mb) ** 2
    return sab / math.sqrt(saa * sbb)


def spearman(a: list[float], b: list[float]) -> float:
    return pearson(rangos(a), rangos(b))


def _betacf(a: float, b: float, x: float) -> float:
    # Fracción continua de Lentz (Numerical Recipes, betacf).
    tiny, eps = 1e-300, 1e-15
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 301):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < eps:
            break
    return h


def beta_inc(a: float, b: float, x: float) -> float:
    """Beta incompleta regularizada I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    ln = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x)
    if x < (a + 1.0) / (a + b + 2.0):
        return math.exp(ln) * _betacf(a, b, x) / a
    return 1.0 - math.exp(ln) * _betacf(b, a, 1.0 - x) / b


def p_spearman(rho: float, n: int) -> float:
    if abs(rho) >= 1.0 - 1e-12:
        return 0.0
    gl = n - 2
    t2 = rho * rho * gl / (1.0 - rho * rho)
    return beta_inc(gl / 2.0, 0.5, gl / (gl + t2))


def benjamini_hochberg(p: list[float]) -> list[float]:
    m = len(p)
    orden = sorted(range(m), key=lambda i: (p[i], i))
    q = [0.0] * m
    minimo = 1.0
    for rango in range(m, 0, -1):
        i = orden[rango - 1]
        minimo = min(minimo, p[i] * m / rango)
        q[i] = min(minimo, 1.0)
    return q


def mediana(v: list[float]) -> float:
    s = sorted(v)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def media(v: list[float]) -> float:
    return sum(v) / len(v)


# ----------------------------- motor ---------------------------------------------------------

def _tipo(var: str) -> str:
    return CONFIG["variables"][var]["tipo"]


def analizar(dias: list[dict], config: dict = CONFIG) -> dict:
    por_dia = {d["dia"]: d["valores"] for d in dias}
    con_datos = sorted(k for k, v in por_dia.items() if any(x is not None for x in v.values()))
    if len(con_datos) < config["dias_minimos"]:
        return {"version": config["version"], "motivo": "pocos_dias", "dias_con_datos": len(con_datos),
                "hallazgos": [], "tendencias": [], "pruebas": [], "racha": _racha(con_datos)}

    pruebas = []
    for x in config["x"]:
        for y in config["y"]:
            if x == y:
                continue
            L = config["desfase_por_y"][y]
            # El mismo día, x→y e y→x son la misma correlación: se prueba una sola vez.
            if L == 0 and x in config["y"] and y in config["x"] and config["desfase_por_y"].get(x) == 0 and x > y:
                continue
            for L in [L]:
                xs, ys = [], []
                for d in con_datos:
                    vx = por_dia[d].get(x)
                    vy = por_dia.get(d + L, {}).get(y)
                    if vx is not None and vy is not None:
                        xs.append(float(vx))
                        ys.append(float(vy))
                n = len(xs)
                if n < config["pares_minimos"] or len(set(xs)) < 2 or len(set(ys)) < 2:
                    continue
                if _tipo(x) == "tema":
                    alto = [b for a, b in zip(xs, ys) if a == 1.0]
                    bajo = [b for a, b in zip(xs, ys) if a == 0.0]
                else:
                    med = mediana(xs)
                    alto = [b for a, b in zip(xs, ys) if a > med]
                    bajo = [b for a, b in zip(xs, ys) if a < med]
                if len(alto) < config["minimo_por_grupo"] or len(bajo) < config["minimo_por_grupo"]:
                    continue
                rho = spearman(xs, ys)
                pruebas.append({
                    "x": x, "y": y, "desfase": L, "n": n, "rho": rho, "p": p_spearman(rho, n),
                    "rho_c": rho * n / (n + config["contraccion_n0"]),
                    "media_alto": media(alto), "n_alto": len(alto),
                    "media_bajo": media(bajo), "n_bajo": len(bajo),
                })

    for prueba, q in zip(pruebas, benjamini_hochberg([t["p"] for t in pruebas])):
        prueba["q"] = q

    mejores: dict[tuple[str, str], dict] = {}
    for t in pruebas:
        if t["q"] <= config["q_fdr"] and abs(t["rho_c"]) >= config["rho_minimo"]:
            clave = (t["x"], t["y"])
            previo = mejores.get(clave)
            if previo is None or (t["q"], t["desfase"]) < (previo["q"], previo["desfase"]):
                mejores[clave] = t
    hallazgos = sorted(mejores.values(), key=lambda t: (t["q"], -abs(t["rho_c"]), t["x"], t["y"]))
    for h in hallazgos:
        h["confianza"] = "alta" if h["q"] <= 0.01 and h["n"] >= 30 else "media"

    return {
        "version": config["version"],
        "motivo": None,
        "dias_con_datos": len(con_datos),
        "hallazgos": hallazgos,
        "tendencias": _tendencias(por_dia, con_datos, config["tendencias"]),
        "pruebas": pruebas,
        "racha": _racha(con_datos),
    }


def _tendencias(por_dia: dict, con_datos: list[int], c: dict) -> list[dict]:
    D = con_datos[-1]
    salida = []
    for var in ("sueno_horas", "pasos", "vasos_agua"):
        rec = [float(por_dia[d][var]) for d in con_datos if D - c["ventana_reciente"] < d <= D and por_dia[d].get(var) is not None]
        base = [float(por_dia[d][var]) for d in con_datos
                if D - c["ventana_reciente"] - c["ventana_base"] < d <= D - c["ventana_reciente"] and por_dia[d].get(var) is not None]
        if len(rec) < c["minimo_reciente"] or len(base) < c["minimo_base"]:
            continue
        mb = media(base)
        de = math.sqrt(sum((v - mb) ** 2 for v in base) / (len(base) - 1))
        if de == 0:
            continue
        d = (media(rec) - mb) / de
        if abs(d) >= c["d_minimo"]:
            salida.append({"variable": var, "media_reciente": media(rec), "media_base": mb, "d": d,
                           "n_reciente": len(rec), "n_base": len(base)})
    return salida


def _racha(con_datos: list[int]) -> int:
    if not con_datos:
        return 0
    r = 1
    for a, b in zip(reversed(con_datos[:-1]), reversed(con_datos[1:])):
        if b - a != 1:
            break
        r += 1
    return r
