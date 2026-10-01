"""Ida y vuelta del formato tabien-lineal-v1: lo que se lee es lo que se cuantizó."""

import numpy as np
import pytest

from exportar.lineal import DTYPES, cuantizar, descuantizar, exportar, leer
from modelos.m1 import ModeloLineal


@pytest.mark.parametrize("dtype", DTYPES)
def test_ida_y_vuelta(tmp_path, dtype):
    rng = np.random.default_rng(0)
    bits, K = 6, 3
    m = ModeloLineal(
        bits=bits,
        etiquetas=["a", "b", "c"],
        idf=rng.uniform(1, 5, 1 << bits).astype(np.float32),
        W=rng.standard_normal((1 << bits, K)).astype(np.float32),
        b=rng.standard_normal(K).astype(np.float32),
    )
    exportar(m, dtype, tmp_path, {"version": "prueba", "publicable": False})
    leido = leer(tmp_path)
    q, escalas = cuantizar(m.W, dtype)
    np.testing.assert_array_equal(leido.W, descuantizar(q, escalas))
    np.testing.assert_array_equal(leido.idf, m.idf)
    np.testing.assert_array_equal(leido.b, m.b)
    if dtype == "int8":
        assert np.abs(leido.W - m.W).max() <= escalas.max() / 2 + 1e-7
