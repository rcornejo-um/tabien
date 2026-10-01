"""Pipeline de texto `texto-v1` (implementación de referencia en Python).

Contrato: `spec/texto.md`. Fixtures: `spec/fixtures/`. La implementación TS
(`app/src/ml/texto/`) debe comportarse idéntica.
"""

from .anonimizar import anonimizar
from .normalizar import normalizar
from .tokenizar import palabras, features, features_de_texto, fnv1a32, cubetas

PIPELINE_VERSION = "texto-v1"

__all__ = [
    "PIPELINE_VERSION",
    "anonimizar",
    "normalizar",
    "palabras",
    "features",
    "features_de_texto",
    "fnv1a32",
    "cubetas",
    "preparar",
]


def preparar(texto: str) -> list[str]:
    """Texto original → features (anonimizar → normalizar → tokenizar)."""
    return features_de_texto(normalizar(anonimizar(texto)))
