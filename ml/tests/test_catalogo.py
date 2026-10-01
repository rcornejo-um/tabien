"""Criterio F4: el 100% del catálogo pasa los guardarraíles (y el verificador sí atrapa violaciones)."""

import copy

import pytest

from rutas.catalogo import CATALOGO, problemas


def test_catalogo_pasa_guardarrailes():
    assert problemas(CATALOGO) == []


def _con(habito: dict) -> dict:
    c = copy.deepcopy(CATALOGO)
    c["habitos"].append({"guardarrailes": ["no_clinico", "sin_metas_de_peso"], "prerrequisitos": [],
                         "evidencia": ["oms_dieta"], "dificultad": 1, "contraindicaciones": [], **habito})
    return c


@pytest.mark.parametrize("descripcion", [
    "Cuenta las calorías de tu almuerzo.",
    "Haz ayuno intermitente hasta el mediodía.",
    "Sáltate la once para bajar de peso.",
    "Pésate cada mañana.",
    "Come una porción menor en la cena.",
    "Si tienes insomnio, acuéstate más tarde.",
])
def test_el_verificador_atrapa_habitos_prohibidos(descripcion):
    c = _con({"id": "x1", "area": "comida", "descripcion": descripcion, "tipo_comida": "aditivo"})
    assert any(e.startswith("x1:") for e in problemas(c))


def test_comida_debe_ser_aditiva_o_de_regularidad():
    c = _con({"id": "x2", "area": "comida", "descripcion": "Prueba un desayuno distinto."})
    assert any("aditivo" in e for e in problemas(c))


def test_sin_fuente_no_entra():
    c = _con({"id": "x3", "area": "agua", "descripcion": "Toma agua.", "evidencia": []})
    assert any("sin fuente" in e for e in problemas(c))
