"""Capa de riesgo `riesgo-v1-prototipo` (referencia en Python). Contrato: spec/riesgo.md.

PROTOTIPO SIN REVISIÓN CLÍNICA: no usar con personas reales hasta que se revise el léxico.
En el taller sirve para excluir de entrenamiento y etiquetado el texto de días con riesgo.
"""

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[3]
LEXICO = json.loads((_RAIZ / "spec" / "riesgo" / "lexico-v1.json").read_text(encoding="utf-8"))
VERSION = LEXICO["version"]

_ALARGADAS = re.compile(r"([a-zñ])\1{2,}")
_FUERA = re.compile(r"[^a-z0-9ñ]+")


def _envolver(patron: str) -> re.Pattern[str]:
    return re.compile(LEXICO["frontera"].replace("PATRON", patron))


_EXCEPCIONES = [_envolver(e["patron"]) for e in LEXICO["excepciones"]]
_REGLAS = [(r["id"], r["categoria"], _envolver(r["patron"])) for r in LEXICO["reglas"]]
_CATEGORIAS = list(dict.fromkeys(r["categoria"] for r in LEXICO["reglas"]))


def preparar(texto: str) -> str:
    texto = unicodedata.normalize("NFKC", texto).lower()
    texto = "".join(
        c if c == "ñ" else "".join(d for d in unicodedata.normalize("NFD", c) if not 0x300 <= ord(d) <= 0x36F)
        for c in texto
    )
    texto = _ALARGADAS.sub(r"\1", texto)
    return _FUERA.sub(" ", texto).strip(" ")


@dataclass(frozen=True)
class Resultado:
    activado: bool
    categorias: list[str]
    reglas: list[str]


def evaluar(texto: str) -> Resultado:
    t = preparar(texto)
    for e in _EXCEPCIONES:
        t = e.sub(" ", t)
    reglas, cats = [], set()
    for rid, cat, patron in _REGLAS:
        if patron.search(t):
            reglas.append(rid)
            cats.add(cat)
    categorias = [c for c in _CATEGORIAS if c in cats]
    return Resultado(bool(reglas), categorias, reglas)
