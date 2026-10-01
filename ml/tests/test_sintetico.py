"""Generador sintético v2: reproducible, coherente y con efectos plantados recuperables."""

import hashlib
import json
from collections import defaultdict

import numpy as np
import pytest
from scipy.stats import spearmanr

from data.sintetico import ETIQUETAS, generar


@pytest.fixture(scope="module")
def datos():
    return generar(semilla=11, personas=40, dias=60)


def test_reproducible():
    a, _ = generar(semilla=5, personas=3, dias=20)
    b, _ = generar(semilla=5, personas=3, dias=20)
    h = lambda f: hashlib.sha256(json.dumps(f, ensure_ascii=False).encode()).hexdigest()
    assert h(a) == h(b)


def test_etiquetas_en_taxonomia_y_tono_en_rango(datos):
    filas, _ = datos
    for f in filas:
        assert -2 <= f["tono"] <= 2
        if f["texto"] is not None:
            assert set(f["etiquetas"]) <= set(ETIQUETAS)


def test_cantidades_aparecen_en_el_texto(datos):
    filas, _ = datos
    vistas = 0
    for f in filas:
        for c in f["cantidades"] or []:
            v = c["valor"]
            txt = str(int(v)) if float(v).is_integer() else f"{v:.1f}".replace(".", ",")
            # El texto puede haber perdido tildes o tener un typo, pero el número se conserva.
            assert txt in f["texto"], (c, f["texto"])
            vistas += 1
    assert vistas > 50


def _rho_por_persona(filas, x, y, desfase):
    serie = defaultdict(list)
    for f in filas:
        serie[f["persona"]].append(f)
    rhos = {}
    for p, dias in serie.items():
        dias.sort(key=lambda f: f["dia"])
        xs = [d[x] for d in dias[: len(dias) - desfase]]
        ys = [d[y] for d in dias[desfase:]]
        rhos[p] = spearmanr(xs, ys).statistic
    return rhos


def _por_magnitud(rhos, efectos, clave):
    grupos = defaultdict(list)
    for p, r in rhos.items():
        grupos[efectos["personas"][p]["efectos"][clave]].append(r)
    return {m: float(np.mean(v)) for m, v in grupos.items()}


def test_e1_estres_sueno_recuperable(datos):
    filas, efectos = datos
    m = _por_magnitud(_rho_por_persona(filas, "verdad_estres", "sueno_horas", 1), efectos, "estres_sueno")
    assert m[-1.0] < -0.35
    assert m[-1.0] < m[-0.5] < m[0.0]
    assert abs(m[0.0]) < 0.15


def test_e2_ejercicio_tono_recuperable(datos):
    filas, efectos = datos
    m = _por_magnitud(_rho_por_persona(filas, "verdad_ejercicio", "tono", 0), efectos, "ejercicio_tono")
    assert m[1.0] > 0.2
    assert m[1.0] > m[0.5] > m[0.0]


def test_e3_pantallas_sueno_recuperable(datos):
    filas, efectos = datos
    m = _por_magnitud(_rho_por_persona(filas, "verdad_pantallas", "sueno_horas", 1), efectos, "pantallas_sueno")
    assert m[-1.0] < -0.2
    assert m[-1.0] < m[0.0]


def test_par_sin_efecto_plantado_queda_cerca_de_cero(datos):
    filas, _ = datos
    rhos = list(_rho_por_persona(filas, "vasos_agua", "sueno_horas", 1).values())
    assert abs(float(np.mean(rhos))) < 0.1
