"""Generador sintético **mínimo** (D0 v0) — solo para medir MECÁNICA en el LT0-ML de F0.

Sirve para: entrenar un modelo con la forma real (10 etiquetas, n-gramas, hashing) y medir
peso, latencia y paridad. NO sirve para medir comprensión de texto: un modelo entrenado
con esto aprende el generador, no a las personas (prompt maestro §6.3).

El generador v2 (estado latente diario, efectos plantados, verdad de fondo) es de F1.

Uso:
    env PYTHONPATH=src uv run python -m data.sintetico_v0
"""

import hashlib
import json
import random
import unicodedata
from pathlib import Path

ETIQUETAS = [
    "sueno", "estres", "alimentacion", "ejercicio", "animo",
    "social", "estudio_trabajo", "pantallas", "hidratacion", "descanso",
]

FRASES: dict[str, list[str]] = {
    "sueno": [
        "dormí pésimo anoche", "me quedé despierto hasta las 3", "dormí como 5 horas nomás",
        "no pude dormir nada", "dormí bacán, 8 horas", "me desperté muy cansado",
        "me acosté tarde", "ando con sueño todo el día", "dormí del uno",
    ],
    "estres": [
        "mucho estrés con las pruebas", "ando con ansiedad por el certamen",
        "semana pesada, cero tiempo", "me tiene chato todo", "ando colapsado",
        "demasiadas cosas encima", "estoy reventado de estrés",
    ],
    "alimentacion": [
        "almorcé completo con papas fritas", "comí puras sopaipillas",
        "me salté el desayuno otra vez", "comí ensalada y pollo",
        "tomé como 4 cafés", "cené tarde y pesado", "almorcé a la hora por fin",
    ],
    "ejercicio": [
        "salí a trotar 30min", "fui al gym po", "caminé harto hoy", "cero ejercicio, puro sillón",
        "jugué pichanga con los cabros", "hice yoga en la mañana", "anduve en bici 5km",
    ],
    "animo": [
        "me siento bacán hoy", "ando bajoneado", "día tranqui", "estoy feliz, salió todo bien",
        "ando medio triste", "me siento con energía", "ando de malas",
    ],
    "social": [
        "salí con los amigos", "almorcé con mi familia", "me junté con la polola",
        "carrete el viernes", "no hablé con nadie en todo el día", "videollamada con mi mamá",
    ],
    "estudio_trabajo": [
        "harta pega en el trabajo", "estudié toda la tarde para cálculo",
        "entregué la tesis por fin", "reunión eterna en la oficina", "turno doble en la pega",
        "me quedé estudiando hasta tarde",
    ],
    "pantallas": [
        "estuve pegado en el celular", "maratón de series", "mucho tiktok antes de dormir",
        "jugué play hasta las 2", "deje el celu fuera de la pieza",
    ],
    "hidratacion": [
        "tomé harta agua hoy", "casi no tomé agua", "llené la botella 3 veces",
        "puro jugo y bebida, nada de agua", "me acordé de tomar agua",
    ],
    "descanso": [
        "me tomé la tarde libre", "dormí siesta", "día de descanso total",
        "no paré en todo el día", "me relajé leyendo un rato",
    ],
}
EMOJIS = {
    "sueno": ["😴", "🥱"], "estres": ["😩", "😰", "🤯"], "alimentacion": ["🍔", "☕", "🥗"],
    "ejercicio": ["💪", "🏃‍♂️"], "animo": ["😊", "😢"], "social": ["🥳", "🍻"],
    "estudio_trabajo": ["📚", "💼"], "pantallas": ["📱", "📺"], "hidratacion": ["💧"],
    "descanso": ["😌", "✨"],
}
MULETILLAS = [" po", " cachai", "!!!", "...", " jaja", " weon", " xd"]
NEUTRAS = ["nada especial hoy", "día normal", "lo mismo de siempre", "ok"]


def _estilo(rng: random.Random) -> dict[str, float]:
    return {
        "p_sin_tildes": rng.uniform(0.0, 0.9),
        "p_emoji": rng.uniform(0.0, 0.8),
        "p_muletilla": rng.uniform(0.0, 0.6),
        "p_mayus": rng.uniform(0.0, 0.15),
        "p_alargar": rng.uniform(0.0, 0.25),
        "p_dato_personal": 0.02,
    }


def _ensuciar(texto: str, estilo: dict[str, float], rng: random.Random) -> str:
    if rng.random() < estilo["p_sin_tildes"]:
        texto = "".join(
            c if c in "ñÑ" else unicodedata.normalize("NFD", c)[0] for c in texto
        )
    if rng.random() < estilo["p_mayus"]:
        texto = texto.upper()
    if rng.random() < estilo["p_alargar"]:
        i = rng.randrange(len(texto))
        if texto[i].isalpha():
            texto = texto[:i] + texto[i] * rng.randint(3, 5) + texto[i + 1:]
    return texto


def _nota(rng: random.Random, estilo: dict[str, float]) -> tuple[str, list[str]]:
    n = rng.choices([0, 1, 2, 3], weights=[0.08, 0.45, 0.35, 0.12])[0]
    temas = rng.sample(ETIQUETAS, n)
    partes = [rng.choice(FRASES[t]) for t in temas] or [rng.choice(NEUTRAS)]
    nota = ", ".join(partes)
    if rng.random() < estilo["p_muletilla"]:
        nota += rng.choice(MULETILLAS)
    if temas and rng.random() < estilo["p_emoji"]:
        nota += " " + rng.choice(EMOJIS[rng.choice(temas)])
    if rng.random() < estilo["p_dato_personal"]:
        nota += rng.choice([" llamar al +56 9 8765 4321", " mi rut 12.345.678-9", " ana@uc.cl"])
    return _ensuciar(nota, estilo, rng), sorted(temas)


def generar(semilla: int, personas: int, dias: int) -> list[dict]:
    rng = random.Random(semilla)
    filas = []
    for p in range(personas):
        estilo = _estilo(rng)
        for d in range(dias):
            if rng.random() < 0.8:  # no todas las personas escriben todos los días
                texto, temas = _nota(rng, estilo)
                filas.append({"persona": f"s{semilla}-p{p:03d}", "dia": d, "texto": texto, "etiquetas": temas})
    return filas


def guardar(filas: list[dict], ruta: Path) -> str:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    contenido = "".join(json.dumps(f, ensure_ascii=False) + "\n" for f in filas).encode("utf-8")
    ruta.write_bytes(contenido)
    return hashlib.sha256(contenido).hexdigest()


if __name__ == "__main__":
    base = Path(__file__).resolve().parent
    manifiesto = {"generador": "sintetico_v0", "uso_permitido": "solo mecánica (LT0-ML)", "archivos": {}}
    for nombre, semilla, personas, dias in [("entrenamiento", 1, 40, 60), ("paridad", 2, 13, 50)]:
        filas = generar(semilla, personas, dias)
        ruta = base / "generado" / f"d0_v0_{nombre}.jsonl"
        manifiesto["archivos"][ruta.name] = {
            "sha256": guardar(filas, ruta), "filas": len(filas), "semilla": semilla,
            "personas": personas, "dias": dias,
        }
        print(f"{ruta.name}: {len(filas)} notas")
    (base / "manifiestos").mkdir(exist_ok=True)
    (base / "manifiestos" / "d0_v0.json").write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
