"""Motor de patrones: estadística propia contra scipy y reglas del contrato."""

import random

import numpy as np
import pytest
from scipy.stats import false_discovery_control, spearmanr

from patrones import analizar, benjamini_hochberg, beta_inc, p_spearman, rangos, spearman
from scipy.special import betainc


def test_rangos_con_empates():
    assert rangos([10, 20, 20, 5]) == [2.0, 3.5, 3.5, 1.0]


@pytest.mark.parametrize("semilla", range(20))
def test_spearman_y_p_iguales_a_scipy(semilla):
    rng = np.random.default_rng(semilla)
    n = int(rng.integers(14, 80))
    a = rng.integers(0, 2, n).astype(float) if semilla % 2 else rng.normal(size=n).round(1)
    b = 0.4 * a + rng.normal(size=n).round(1)
    r = spearmanr(a, b)
    assert spearman(list(a), list(b)) == pytest.approx(r.statistic, abs=1e-12)
    assert p_spearman(spearman(list(a), list(b)), n) == pytest.approx(r.pvalue, rel=1e-9, abs=1e-14)


@pytest.mark.parametrize("a,b,x", [(6.0, 0.5, 0.3), (14.5, 0.5, 0.97), (1.0, 0.5, 0.01), (40.0, 0.5, 0.5)])
def test_beta_incompleta(a, b, x):
    assert beta_inc(a, b, x) == pytest.approx(betainc(a, b, x), rel=1e-11)


def test_bh_igual_a_scipy():
    p = list(np.random.default_rng(3).uniform(size=60) ** 3)
    np.testing.assert_allclose(benjamini_hochberg(p), false_discovery_control(p), rtol=1e-12)


def _persona(dias: int, efecto: float, semilla: int = 0, huecos: float = 0.0) -> list[dict]:
    rng = random.Random(semilla)
    estres = [int(rng.random() < 0.4) for _ in range(dias)]
    salida = []
    for d in range(dias):
        if rng.random() < huecos:
            continue
        sueno = 7.0 + (efecto * estres[d - 1] if d > 0 else 0.0) + rng.gauss(0, 0.6)
        salida.append({"dia": d, "valores": {"estres": estres[d], "sueno_horas": round(sueno, 1),
                                              "pasos": rng.randint(3000, 9000)}})
    return salida


def test_menos_de_14_dias_no_hay_hallazgos():
    r = analizar(_persona(13, -2.0))
    assert r["motivo"] == "pocos_dias" and r["hallazgos"] == []


def test_detecta_efecto_fuerte_con_desfase_correcto():
    r = analizar(_persona(45, -1.5, semilla=1))
    h = [h for h in r["hallazgos"] if (h["x"], h["y"]) == ("estres", "sueno_horas")]
    assert len(h) == 1 and h[0]["desfase"] == 1 and h[0]["rho"] < 0
    assert h[0]["media_alto"] < h[0]["media_bajo"]


def test_sin_efecto_rara_vez_hay_hallazgos():
    # Bajo la hipótesis nula global, BH con q = 0,1 acota P(algún hallazgo) ≤ 0,1 por persona.
    # Con 150 personas, el 95% superior de una binomial(150; 0,1) es ~0,15.
    con_alguno = sum(bool(analizar(_persona(45, 0.0, semilla=s))["hallazgos"]) for s in range(150))
    assert con_alguno / 150 <= 0.15


def test_los_huecos_se_respetan_por_indice_de_dia():
    dias = _persona(40, -1.5, semilla=2)
    sin_dia_10 = [d for d in dias if d["dia"] != 10]
    r = analizar(sin_dia_10)
    p = [t for t in r["pruebas"] if (t["x"], t["y"], t["desfase"]) == ("estres", "sueno_horas", 1)][0]
    assert p["n"] == 39 - 2  # se pierden el par (9→10) y el (10→11)


def test_racha():
    dias = [{"dia": d, "valores": {"pasos": 1}} for d in [0, 1, 2, 5, 6, 7, 8]]
    assert analizar(dias)["racha"] == 4
