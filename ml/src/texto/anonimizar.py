"""Paso 1 del contrato: anonimizar correos, RUT y teléfonos.

Sin `\\w`, `\\d` ni `\\b`: en Python son Unicode y en JS son ASCII (ver spec/texto.md).
"""

import re

# Orden obligatorio: correo → RUT → teléfono.
_PATRONES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+"), "<email>"),
    (
        re.compile(r"(?<![A-Za-z0-9_.])[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK](?![A-Za-z0-9_])"),
        "<rut>",
    ),
    (
        re.compile(
            r"(?<![A-Za-z0-9_+])(?:\+?56[ .-]?)?[29][ .-]?[0-9]{4}[ .-]?[0-9]{4}(?![A-Za-z0-9_])"
        ),
        "<telefono>",
    ),
]


def anonimizar(texto: str) -> str:
    for patron, etiqueta in _PATRONES:
        texto = patron.sub(etiqueta, texto)
    return texto
