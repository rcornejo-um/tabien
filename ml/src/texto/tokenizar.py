"""Paso 3 del contrato: palabras, features (palabra + n-gramas 2–5) y hashing FNV-1a."""

import re

_PALABRA = re.compile(r"<[a-z0-9ñ_]+>|[a-z0-9ñ_]+")
N_MIN, N_MAX = 2, 5

_FNV_OFFSET = 0x811C9DC5
_FNV_PRIMO = 0x01000193


def palabras(normalizado: str) -> list[str]:
    return _PALABRA.findall(normalizado)


def features(palabra: str) -> list[str]:
    salida = [f"w:{palabra}"]
    if palabra.startswith("<"):
        return salida
    marcada = f"^{palabra}$"
    for n in range(N_MIN, N_MAX + 1):
        for i in range(len(marcada) - n + 1):
            salida.append(f"c:{marcada[i:i + n]}")
    return salida


def features_de_texto(normalizado: str) -> list[str]:
    return [f for p in palabras(normalizado) for f in features(p)]


def fnv1a32(s: str) -> int:
    h = _FNV_OFFSET
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * _FNV_PRIMO) & 0xFFFFFFFF
    return h


def cubetas(feats: list[str], bits: int) -> list[int]:
    mascara = (1 << bits) - 1
    return [fnv1a32(f) & mascara for f in feats]
