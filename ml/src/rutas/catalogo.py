"""Catálogo de micro-hábitos (spec/rutas/catalogo-v1.json) y verificador de guardarraíles (§4.2)."""

import json
import unicodedata
from pathlib import Path

_RAIZ = Path(__file__).resolve().parents[3]
CATALOGO = json.loads((_RAIZ / "spec" / "rutas" / "catalogo-v1.json").read_text(encoding="utf-8"))


def _plano(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if not 0x300 <= ord(c) <= 0x36F)


def problemas(cat: dict) -> list[str]:
    """Lista de violaciones. Vacía = el catálogo pasa los guardarraíles."""
    errores = []
    habitos = {h["id"]: h for h in cat["habitos"]}
    prohibido = [_plano(p) for p in cat["guardarrailes_prohibido"]]
    for h in cat["habitos"]:
        hid = h["id"]
        texto = _plano(h["descripcion"])
        for p in prohibido:
            if p in texto:
                errores.append(f"{hid}: contiene '{p}' (restricción, peso o lenguaje clínico)")
        if not h.get("evidencia"):
            errores.append(f"{hid}: sin fuente")
        for f in h.get("evidencia", []):
            if f not in cat["fuentes"] or not cat["fuentes"][f].get("url"):
                errores.append(f"{hid}: fuente '{f}' no existe o no tiene enlace")
        if h["dificultad"] not in (1, 2, 3):
            errores.append(f"{hid}: dificultad fuera de 1–3")
        for pre in h["prerrequisitos"]:
            if pre not in habitos:
                errores.append(f"{hid}: prerrequisito '{pre}' no existe")
            elif habitos[pre]["area"] != h["area"]:
                errores.append(f"{hid}: prerrequisito '{pre}' es de otra área")
        if h["area"] == "comida" and h.get("tipo_comida") not in ("aditivo", "regularidad"):
            errores.append(f"{hid}: un hábito de comida debe ser 'aditivo' o 'regularidad'")
        if "no_clinico" not in h.get("guardarrailes", []) or "sin_metas_de_peso" not in h.get("guardarrailes", []):
            errores.append(f"{hid}: faltan guardarraíles declarados")
    for area, a in cat["areas"].items():
        if not 3 <= len(a["pasos"]) <= 5:
            errores.append(f"ruta {area}: debe tener entre 3 y 5 pasos")
        for pid in a["pasos"]:
            if pid not in habitos or habitos[pid]["area"] != area:
                errores.append(f"ruta {area}: paso '{pid}' inválido")
        difs = [habitos[p]["dificultad"] for p in a["pasos"] if p in habitos]
        if difs != sorted(difs):
            errores.append(f"ruta {area}: la dificultad debe ser progresiva")
    return errores
