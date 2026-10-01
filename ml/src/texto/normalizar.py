"""Paso 2 del contrato: normalizar (N1…N7 de spec/texto.md)."""

import json
import re
import unicodedata
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[3]
_EMOJIS = json.loads((_RAIZ / "spec" / "emojis.json").read_text(encoding="utf-8"))

_SE_ELIMINA = frozenset(int(cp, 16) for cp in _EMOJIS["se_elimina"])
_RANGOS = tuple((int(a, 16), int(b, 16)) for a, b in _EMOJIS["rangos_emoji"])
_EMOJI_A_TOKEN = {int(cp, 16): tok for cp, tok in _EMOJIS["emoji_a_token"].items()}
_TOKEN_OTRO = _EMOJIS["token_otro"]

_ALARGADAS = re.compile(r"([a-zñ])\1{2,}")
_NUMERO_UNIDAD = re.compile(r"([0-9])([a-zñ])")
_FUERA_DE_ALFABETO = re.compile(r"[^a-z0-9ñ_<> ]")
_ESPACIOS = re.compile(r" +")


def _es_emoji(cp: int) -> bool:
    return any(a <= cp <= b for a, b in _RANGOS)


def _sin_tilde(c: str) -> str:
    # NFD y quitar solo U+0300–U+036F (no la categoría Mn completa: JS no la tiene igual).
    return "".join(d for d in unicodedata.normalize("NFD", c) if not 0x300 <= ord(d) <= 0x36F)


def _n3(texto: str) -> str:
    partes: list[str] = []
    for c in texto:
        cp = ord(c)
        if cp in _SE_ELIMINA:
            continue
        token = _EMOJI_A_TOKEN.get(cp)
        if token is not None:
            partes.append(f" {token} ")
        elif _es_emoji(cp):
            partes.append(f" {_TOKEN_OTRO} ")
        elif c == "ñ":
            partes.append(c)
        else:
            partes.append(_sin_tilde(c))
    return "".join(partes)


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKC", texto)  # N1
    texto = texto.lower()  # N2
    texto = _n3(texto)  # N3
    texto = _ALARGADAS.sub(r"\1", texto)  # N4
    texto = _NUMERO_UNIDAD.sub(r"\1 \2", texto)  # N5
    texto = _FUERA_DE_ALFABETO.sub(" ", texto)  # N6
    return _ESPACIOS.sub(" ", texto).strip(" ")  # N7
