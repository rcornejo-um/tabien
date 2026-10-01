"""Capa de riesgo: mismos fixtures que vitest."""

import json
from pathlib import Path

import pytest

from riesgo import VERSION, evaluar, preparar

FIX = json.loads((Path(__file__).resolve().parents[2] / "spec/fixtures/riesgo.json").read_text(encoding="utf-8"))


def test_version():
    assert FIX["version"] == VERSION


@pytest.mark.parametrize("caso", FIX["preparacion"], ids=[c["id"] for c in FIX["preparacion"]])
def test_preparacion(caso):
    assert preparar(caso["entrada"]) == caso["esperado"]


@pytest.mark.parametrize("caso", FIX["casos"], ids=[c["id"] for c in FIX["casos"]])
def test_casos(caso):
    r = evaluar(caso["entrada"])
    assert r.categorias == caso["esperado"]
    assert r.activado == bool(caso["esperado"])


def test_ninguna_nota_sintetica_activa_riesgo():
    """El generador D0 no produce contenido de riesgo; si algo se activa, es falsa alarma."""
    from data.sintetico import generar

    filas, _ = generar(semilla=11, personas=40, dias=60)
    activadas = [f["texto"] for f in filas if f["texto"] and evaluar(f["texto"]).activado]
    assert activadas == []
