"""M1: TF-IDF hasheado (palabras + n-gramas de caracteres 2–5) + regresión logística uno-contra-todos.

Las features salen del contrato `texto-v1` (ml/src/texto), así que el runtime TS ve
exactamente las mismas cubetas.
"""

from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier

from texto import cubetas, preparar


def matriz_tf(textos: list[str], bits: int) -> sparse.csr_matrix:
    """Frecuencias por cubeta (filas = notas, columnas = 2^bits cubetas)."""
    filas, columnas = [], []
    for i, t in enumerate(textos):
        cs = cubetas(preparar(t), bits)
        filas.extend([i] * len(cs))
        columnas.extend(cs)
    datos = np.ones(len(filas), dtype=np.float64)
    m = sparse.csr_matrix((datos, (filas, columnas)), shape=(len(textos), 1 << bits))
    m.sum_duplicates()
    return m


def calcular_idf(tf: sparse.csr_matrix) -> np.ndarray:
    """idf suavizado (igual que scikit-learn): ln((1 + n) / (1 + df)) + 1."""
    n = tf.shape[0]
    df = np.bincount(tf.indices, minlength=tf.shape[1])
    return (np.log((1.0 + n) / (1.0 + df)) + 1.0).astype(np.float32)


def tfidf_l2(tf: sparse.csr_matrix, idf: np.ndarray) -> sparse.csr_matrix:
    x = tf.multiply(idf.astype(np.float64)).tocsr()
    normas = np.sqrt(np.asarray(x.multiply(x).sum(axis=1)).ravel())
    normas[normas == 0] = 1.0
    return sparse.diags(1.0 / normas) @ x


@dataclass
class ModeloLineal:
    """Pesos en float32, listos para exportar. W tiene forma (cubetas, etiquetas)."""

    bits: int
    etiquetas: list[str]
    idf: np.ndarray  # (cubetas,) float32
    W: np.ndarray  # (cubetas, etiquetas) float32
    b: np.ndarray  # (etiquetas,) float32


def entrenar(
    textos: list[str], Y: np.ndarray, etiquetas: list[str], bits: int, C: float = 4.0
) -> ModeloLineal:
    tf = matriz_tf(textos, bits)
    idf = calcular_idf(tf)
    X = tfidf_l2(tf, idf)
    clf = OneVsRestClassifier(LogisticRegression(solver="liblinear", C=C, max_iter=1000))
    clf.fit(X, Y)
    W = np.stack([e.coef_.ravel() for e in clf.estimators_], axis=1).astype(np.float32)
    b = np.array([e.intercept_[0] for e in clf.estimators_], dtype=np.float32)
    return ModeloLineal(bits=bits, etiquetas=list(etiquetas), idf=idf, W=W, b=b)


def predecir_proba(modelo: ModeloLineal, textos: list[str]) -> np.ndarray:
    """Inferencia de referencia (float64), con los pesos tal como están en `modelo`."""
    X = tfidf_l2(matriz_tf(textos, modelo.bits), modelo.idf)
    z = X @ modelo.W.astype(np.float64) + modelo.b.astype(np.float64)
    return 1.0 / (1.0 + np.exp(-z))
