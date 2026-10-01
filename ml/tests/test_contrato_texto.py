"""Fixtures dorados del contrato texto-v1 (los mismos que corre vitest en TS)."""

import json
from pathlib import Path

import pytest

from texto import PIPELINE_VERSION, anonimizar, features, fnv1a32, normalizar, palabras

FIXTURES = Path(__file__).resolve().parents[2] / "spec" / "fixtures"


def _cargar(nombre: str) -> dict:
    datos = json.loads((FIXTURES / nombre).read_text(encoding="utf-8"))
    assert datos["version"] == PIPELINE_VERSION
    return datos


def _ids(casos):
    return [c["id"] for c in casos]


ANON = _cargar("anonimizar.json")["casos"]
NORM = _cargar("normalizar.json")["casos"]
TOK = _cargar("tokenizar.json")
HASH = _cargar("hash.json")["casos"]


@pytest.mark.parametrize("caso", ANON, ids=_ids(ANON))
def test_anonimizar(caso):
    assert anonimizar(caso["entrada"]) == caso["esperado"]


@pytest.mark.parametrize("caso", NORM, ids=_ids(NORM))
def test_normalizar(caso):
    assert normalizar(caso["entrada"]) == caso["esperado"]


@pytest.mark.parametrize("caso", TOK["palabras"], ids=_ids(TOK["palabras"]))
def test_palabras(caso):
    assert palabras(caso["entrada"]) == caso["esperado"]


@pytest.mark.parametrize("caso", TOK["features"], ids=_ids(TOK["features"]))
def test_features(caso):
    assert features(caso["entrada"]) == caso["esperado"]


@pytest.mark.parametrize("caso", HASH, ids=_ids(HASH))
def test_hash(caso):
    assert fnv1a32(caso["entrada"]) == caso["esperado"]


def test_normalizar_es_idempotente():
    for caso in NORM:
        una = normalizar(caso["entrada"])
        assert normalizar(una) == una, caso["id"]


def test_negaciones_nunca_desaparecen():
    for neg in ["no", "nunca", "cero", "nada", "sin"]:
        assert neg in palabras(normalizar(f"{neg.upper()} dormí bien"))
