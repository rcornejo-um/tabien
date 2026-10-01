"""Exportación de modelos lineales al formato `tabien-lineal-v1` (weights.bin + manifest.json).

weights.bin (little-endian), en este orden:
  idf      float32[cubetas]
  b        float32[etiquetas]
  escalas  float32[etiquetas]       (solo si dtype = int8)
  W        dtype[cubetas * etiquetas]  (por cubeta y luego etiqueta)

`leer` devuelve el modelo DESCUANTIZADO en float32: es lo que ve el runtime TS, y es lo que
usa la referencia de Python para generar el conjunto de paridad.
"""

import hashlib
import json
from pathlib import Path

import numpy as np

from modelos.m1 import ModeloLineal
from texto import PIPELINE_VERSION

FORMATO = "tabien-lineal-v1"
DTYPES = ("float32", "float16", "int8")


def cuantizar(W: np.ndarray, dtype: str) -> tuple[np.ndarray, np.ndarray | None]:
    if dtype == "float32":
        return W.astype("<f4"), None
    if dtype == "float16":
        return W.astype("<f2"), None
    if dtype == "int8":
        maximo = np.abs(W).max(axis=0)
        escalas = np.where(maximo > 0, maximo / 127.0, 1.0).astype(np.float32)
        q = np.clip(np.rint(W / escalas), -127, 127).astype(np.int8)
        return q, escalas
    raise ValueError(f"dtype desconocido: {dtype}")


def descuantizar(q: np.ndarray, escalas: np.ndarray | None) -> np.ndarray:
    if escalas is None:
        return q.astype(np.float32)
    # float32 × float32 redondeado a float32: el runtime TS hace lo mismo.
    return q.astype(np.float32) * escalas.astype(np.float32)


def serializar(modelo: ModeloLineal, dtype: str) -> tuple[bytes, dict]:
    q, escalas = cuantizar(modelo.W, dtype)
    partes: list[tuple[str, np.ndarray]] = [
        ("idf", modelo.idf.astype("<f4")),
        ("b", modelo.b.astype("<f4")),
    ]
    if escalas is not None:
        partes.append(("escalas", escalas.astype("<f4")))
    partes.append(("W", np.ascontiguousarray(q)))
    secciones, offset, trozos = {}, 0, []
    for nombre, arr in partes:
        datos = arr.tobytes()
        secciones[nombre] = {"offset": offset, "dtype": str(arr.dtype.name), "largo": int(arr.size)}
        trozos.append(datos)
        offset += len(datos)
    return b"".join(trozos), secciones


def exportar(
    modelo: ModeloLineal, dtype: str, carpeta: Path, extra: dict
) -> dict:
    carpeta.mkdir(parents=True, exist_ok=True)
    binario, secciones = serializar(modelo, dtype)
    (carpeta / "weights.bin").write_bytes(binario)
    manifiesto = {
        "formato": FORMATO,
        "pipeline_version": PIPELINE_VERSION,
        "bits": modelo.bits,
        "cubetas": 1 << modelo.bits,
        "etiquetas": modelo.etiquetas,
        "dtype": dtype,
        "layout": "cubeta-etiqueta",
        "endianness": "little",
        "secciones": secciones,
        "bytes": len(binario),
        "sha256_pesos": hashlib.sha256(binario).hexdigest(),
        **extra,
    }
    (carpeta / "manifest.json").write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    return manifiesto


def leer(carpeta: Path) -> ModeloLineal:
    manifiesto = json.loads((carpeta / "manifest.json").read_text(encoding="utf-8"))
    assert manifiesto["formato"] == FORMATO
    assert manifiesto["pipeline_version"] == PIPELINE_VERSION
    binario = (carpeta / "weights.bin").read_bytes()
    assert hashlib.sha256(binario).hexdigest() == manifiesto["sha256_pesos"]
    nb, K = manifiesto["cubetas"], len(manifiesto["etiquetas"])

    def seccion(nombre: str, dtype: str) -> np.ndarray:
        s = manifiesto["secciones"][nombre]
        return np.frombuffer(binario, dtype=dtype, count=s["largo"], offset=s["offset"])

    tipos = {"float32": "<f4", "float16": "<f2", "int8": "i1"}
    escalas = seccion("escalas", "<f4") if "escalas" in manifiesto["secciones"] else None
    W = descuantizar(seccion("W", tipos[manifiesto["dtype"]]).reshape(nb, K), escalas)
    return ModeloLineal(
        bits=manifiesto["bits"],
        etiquetas=manifiesto["etiquetas"],
        idf=seccion("idf", "<f4").copy(),
        W=W,
        b=seccion("b", "<f4").copy(),
    )
