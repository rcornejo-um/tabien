"""Generador sintético v2 (D0) — personas simuladas con estado latente y efectos plantados.

Uso permitido (prompt maestro §6.3): probar el pipeline, probar el MOTOR DE PATRONES
(¿recupera los efectos plantados?) y simular rutas. Uso prohibido: reportar desempeño de
comprensión de texto como si fuera real. Un modelo entrenado con esto aprende el generador.

Modelo generativo, por persona y día t:

  estres[t]   = a·estres[t-1] + (1-a)·base + semana_de_pruebas(t) + ruido     (AR(1), en z)
  pantallas[t]  ~ Bernoulli(p_pantallas + 0,15·estres[t])     (pantallas de noche)
  ejercicio[t]  ~ Bernoulli(p_ejercicio − 0,10·estres[t])
  sueno[t]    = base_sueno + β_estres·estres[t-1] + β_pantallas·pantallas[t-1] + ruido
                (horas dormidas la noche ANTERIOR al día t)
  energia[t]  = 0,5·(sueno[t] − base_sueno) − 0,3·estres[t] + ruido
  valencia[t] = −0,6·estres[t] + 0,3·(sueno[t] − base_sueno) + β_ejercicio·ejercicio[t] + ruido
  tono[t]     = valencia redondeada a −2…+2

Efectos plantados (verdad de fondo, en `efectos.json`), cada persona tiene una magnitud por efecto:
  E1  estres(t)    → sueno_horas(t+1)   β_estres    ∈ {0, −0,5, −1,0} horas por DE de estrés
  E2  ejercicio(t) → tono(t)            β_ejercicio ∈ {0, +0,5, +1,0} DE de valencia
  E3  pantallas(t) → sueno_horas(t+1)   β_pantallas ∈ {0, −0,5, −1,0} horas
Cualquier otro par de variables NO tiene efecto plantado (sirve para medir falsos descubrimientos).

La nota se arma con frases elegidas según el estado del día. Cada frase trae sus etiquetas
(multietiqueta), y algunas mencionan cantidades que coinciden con los números del día (para T3).

Uso:  env PYTHONPATH=src uv run python -m data.sintetico
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from pathlib import Path

VERSION = "sintetico-v2"

ETIQUETAS = [
    "sueno", "estres", "alimentacion", "ejercicio", "animo",
    "social", "estudio_trabajo", "pantallas", "hidratacion", "descanso",
]

MAGNITUDES = {
    "estres_sueno": [0.0, -0.5, -1.0],
    "ejercicio_tono": [0.0, 0.5, 1.0],
    "pantallas_sueno": [0.0, -0.5, -1.0],
}

# ---------------------------------------------------------------------------------------------
# Banco de frases. Cada frase: (texto, etiquetas extra). La etiqueta del grupo se agrega sola.
# {h} horas de sueño, {p} pasos, {v} vasos, {c} cafés, {m} minutos, {k} km.
# Las variantes "cl" son chilenismos; se eligen según el estilo de la persona.
# ---------------------------------------------------------------------------------------------

F = dict[str, list[tuple[str, tuple[str, ...]]]]

SUENO: F = {
    "mal": [
        ("dormí pésimo", ()), ("dormí como {h} horas nomás", ()), ("no pude dormir", ()),
        ("me desperté mil veces", ()), ("dormí súper mal", ()), ("me costó quedarme dormido", ()),
        ("dormí {h} horas", ()), ("trasnoché", ()),
    ],
    "mal_cl": [
        ("ando zombie", ()), ("dormí del terror", ()), ("no pegué pestaña", ()),
        ("ando con un sueño terrible", ()), ("dormí como las weas", ()),
    ],
    "bien": [
        ("dormí bien", ()), ("dormí {h} horas", ()), ("dormí como tronco", ()),
        ("descansé harto anoche", ("descanso",)), ("me acosté temprano", ()),
    ],
    "bien_cl": [("dormí bacán", ()), ("dormí la raja", ()), ("dormí del uno", ())],
}

ESTRES: F = {
    "alto": [
        ("mucho estrés", ()), ("ando con ansiedad", ()), ("estoy colapsado", ()),
        ("demasiadas cosas encima", ()), ("me siento sobrepasado", ()),
        ("estrés por la prueba", ("estudio_trabajo",)), ("ando con la cabeza a mil", ()),
    ],
    "alto_cl": [
        ("ando chato", ()), ("estoy reventado", ()), ("ando con los nervios de punta", ()),
        ("estoy hasta el pico", ()), ("me tiene choreado todo", ("animo",)),
    ],
    "bajo": [("día tranquilo, sin estrés", ()), ("me sentí relajado", ("descanso",))],
    "bajo_cl": [("día tranqui", ()), ("todo piola hoy", ())],
}

ESTUDIO_TRABAJO: F = {
    "carga": [
        ("harta pega en el trabajo", ()), ("estudié toda la tarde", ()), ("reunión eterna", ()),
        ("me quedé estudiando hasta tarde", ()), ("entregas todo el día", ()),
        ("prueba de cálculo mañana", ()), ("turno largo", ()),
    ],
    "carga_cl": [("mucha pega", ()), ("puro estudiar", ()), ("el certamen me tiene loco", ("estres",))],
    "logro": [("entregué el informe", ()), ("me fue bien en la prueba", ("animo",)), ("terminé la tarea", ())],
}

EJERCICIO: F = {
    "si": [
        ("salí a trotar {m} min", ()), ("fui al gimnasio", ()), ("caminé harto, como {p} pasos", ()),
        ("hice yoga", ()), ("anduve en bici {k} km", ()), ("subí escaleras todo el día", ()),
        ("entrené piernas", ()),
    ],
    "si_cl": [("fui al gym po", ()), ("jugué una pichanga", ("social",)), ("salí a correr con los cabros", ("social",))],
    "no": [("cero ejercicio", ()), ("no me moví nada", ()), ("puro sillón", ("descanso",))],
}

PANTALLAS: F = {
    "si": [
        ("me quedé pegado en el celular", ()), ("maratón de series", ()),
        ("scrolleando hasta tarde", ()), ("jugué play hasta las 2", ()),
        ("mucho tiktok antes de dormir", ("sueno",)),
    ],
    "si_cl": [("pegado en el celu", ()), ("vi series hasta las mil", ())],
    "no": [("dejé el celular fuera de la pieza", ()), ("nada de pantallas en la noche", ())],
}

ANIMO: F = {
    "bajo": [
        ("ando bajoneado", ()), ("me siento triste", ()), ("ando de malas", ()),
        ("día gris", ()), ("me siento solo", ("social",)),
    ],
    "bajo_cl": [("ando pa la cagá", ()), ("ando bajón", ()), ("ando achacado", ())],
    "alto": [
        ("me siento feliz", ()), ("ando con energía", ()), ("buen día", ()),
        ("estoy contento", ()), ("me siento bien", ()),
    ],
    "alto_cl": [("me siento la raja", ()), ("ando prendido", ()), ("día bacán", ())],
}

ALIMENTACION: F = {
    "x": [
        ("almorcé tarde", ()), ("me salté el desayuno", ()), ("comí ensalada", ()),
        ("comí puras papas fritas", ()), ("tomé {c} cafés", ()), ("cené pesado", ()),
        ("almorcé con mi familia", ("social",)), ("comí fruta", ()),
    ],
    "x_cl": [("me comí un completo", ()), ("puras sopaipillas", ()), ("almorcé a la rápida", ())],
}

HIDRATACION: F = {
    "poca": [("casi no tomé agua", ()), ("tomé {v} vasos de agua nomás", ()), ("puro jugo, nada de agua", ("alimentacion",))],
    "mucha": [("tomé harta agua", ()), ("tomé {v} vasos de agua", ()), ("llené la botella 3 veces", ())],
}

SOCIAL: F = {
    "x": [
        ("salí con amigos", ()), ("vi a mi familia", ()), ("videollamada con mi mamá", ()),
        ("no hablé con nadie", ()), ("almuerzo con compañeros", ("alimentacion",)),
    ],
    "x_cl": [("carrete con los cabros", ()), ("me junté con la polola", ()), ("salí con el pololo", ())],
}

DESCANSO: F = {
    "si": [("me tomé la tarde libre", ()), ("día de descanso", ()), ("me relajé leyendo", ()), ("dormí siesta", ("sueno",))],
    "no": [("no paré en todo el día", ()), ("ni un respiro", ("estres",))],
}

NEUTRAS = ["día normal", "nada especial", "lo mismo de siempre", "ok", "normal no más", "meh"]
MULETILLAS = [" po", " cachai", "!!!", "...", " jaja", " xd", " weon", " igual"]
# Emojis solo cuando calzan con el sentido de la frase (no "no paré en todo el día 😌").
EMOJI_COHERENTE = {
    ("sueno", "mal"): ["😴", "🥱"], ("estres", "alto"): ["😩", "😰", "🤯"],
    ("alimentacion", "x"): ["🍔", "☕", "🥗"], ("ejercicio", "si"): ["💪", "🏃‍♂️"],
    ("animo", "bajo"): ["😢", "😞"], ("animo", "alto"): ["😊", "😁", "✨"],
    ("social", "x"): ["🥳", "🍻"], ("estudio_trabajo", "carga"): ["📚", "💼"],
    ("pantallas", "si"): ["📱", "📺"], ("hidratacion", "mucha"): ["💧"], ("descanso", "si"): ["😌"],
}


@dataclass
class Estilo:
    p_nota: float
    p_numeros: float
    p_chilenismo: float
    p_sin_tildes: float
    p_emoji: float
    p_muletilla: float
    p_typo: float
    p_mayus: float
    p_alargar: float
    frases_max: int


@dataclass
class Persona:
    id: str
    estilo: Estilo
    a_estres: float
    base_estres: float
    base_sueno: float
    p_ejercicio: float
    p_pantallas: float
    base_pasos: int
    media_agua: float
    efectos: dict[str, float] = field(default_factory=dict)


def _crear_persona(rng: random.Random, i: int, semilla: int) -> Persona:
    estilo = Estilo(
        p_nota=rng.uniform(0.55, 0.95),
        p_numeros=rng.uniform(0.3, 0.95),
        p_chilenismo=rng.uniform(0.0, 0.7),
        p_sin_tildes=rng.uniform(0.0, 0.95),
        p_emoji=rng.uniform(0.0, 0.7),
        p_muletilla=rng.uniform(0.0, 0.5),
        p_typo=rng.uniform(0.0, 0.15),
        p_mayus=rng.uniform(0.0, 0.08),
        p_alargar=rng.uniform(0.0, 0.2),
        frases_max=rng.choice([1, 2, 2, 3, 3, 4]),
    )
    return Persona(
        id=f"d0v2-s{semilla}-p{i:03d}",
        estilo=estilo,
        a_estres=rng.uniform(0.5, 0.85),
        base_estres=rng.uniform(-0.5, 0.5),
        base_sueno=rng.uniform(6.0, 8.0),
        p_ejercicio=rng.uniform(0.1, 0.6),
        p_pantallas=rng.uniform(0.15, 0.6),
        base_pasos=rng.randint(3000, 9000),
        media_agua=rng.uniform(2.0, 8.0),
        efectos={k: rng.choice(v) for k, v in MAGNITUDES.items()},
    )


def _semana_de_pruebas(dia: int, desfase: int) -> float:
    # Cada ~5 semanas, una semana de pruebas que sube el estrés.
    return 1.0 if ((dia + desfase) // 7) % 5 == 4 else 0.0


# ------------------------------- texto -------------------------------------------------------

def _quitar_tildes(t: str) -> str:
    return "".join(c if c in "ñÑ" else unicodedata.normalize("NFD", c)[0] for c in t)


def _typo(t: str, rng: random.Random) -> str:
    letras = [i for i, c in enumerate(t) if c.isalpha()]
    if len(letras) < 4:
        return t
    i = rng.choice(letras[1:-1])
    op = rng.random()
    if op < 0.4:  # intercambiar
        return t[:i] + t[i + 1] + t[i] + t[i + 2:]
    if op < 0.7:  # omitir
        return t[:i] + t[i + 1:]
    return t[:i] + t[i] + t[i:]  # duplicar


def _alargar(t: str, rng: random.Random) -> str:
    """Alarga la última vocal de una palabra ("nooo", "contentoooo"), como escribe la gente."""
    palabras = t.split(" ")
    idx = [i for i, w in enumerate(palabras) if any(c in "aeiouáéíóú" for c in w.lower())]
    if not idx:
        return t
    i = rng.choice(idx)
    w = palabras[i]
    j = max(k for k, c in enumerate(w) if c.lower() in "aeiouáéíóú")
    palabras[i] = w[:j] + w[j] * rng.randint(3, 6) + w[j + 1:]
    return " ".join(palabras)


def _elegir(grupo: F, clave: str, rng: random.Random, estilo: Estilo) -> tuple[str, tuple[str, ...]]:
    if f"{clave}_cl" in grupo and rng.random() < estilo.p_chilenismo:
        return rng.choice(grupo[f"{clave}_cl"])
    return rng.choice(grupo[clave])


def _rellenar(texto: str, dia: dict, rng: random.Random) -> tuple[str, list[dict]]:
    cantidades = []
    if "{h}" in texto:
        h = dia["sueno_horas"]
        h_txt = str(int(round(h))) if rng.random() < 0.8 else f"{h:.1f}".replace(".", ",")
        texto = texto.replace("{h}", h_txt)
        cantidades.append({"tipo": "sueno_horas", "valor": float(h_txt.replace(",", "."))})
    if "{p}" in texto:
        p = int(round(dia["pasos"], -2))
        texto = texto.replace("{p}", str(p))
        cantidades.append({"tipo": "pasos", "valor": p})
    if "{v}" in texto:
        v = dia["vasos_agua"]
        texto = texto.replace("{v}", str(v))
        cantidades.append({"tipo": "vasos_agua", "valor": v})
    if "{c}" in texto:
        c = rng.randint(2, 5)
        texto = texto.replace("{c}", str(c))
        cantidades.append({"tipo": "cafes", "valor": c})
    if "{m}" in texto:
        m = rng.choice([20, 30, 40, 45, 60])
        texto = texto.replace("{m}", str(m))
        cantidades.append({"tipo": "minutos_ejercicio", "valor": m})
    if "{k}" in texto:
        k = rng.choice([3, 5, 8, 10])
        texto = texto.replace("{k}", str(k))
        cantidades.append({"tipo": "km", "valor": k})
    return texto, cantidades


def _candidatas(dia: dict, persona: Persona, rng: random.Random) -> list[tuple[float, str, F, str]]:
    """(peso, etiqueta, grupo, clave) de lo que la persona podría contar hoy."""
    d_sueno = dia["sueno_horas"] - persona.base_sueno
    c: list[tuple[float, str, F, str]] = []
    if d_sueno < -0.8:
        c.append((2.0 + abs(d_sueno), "sueno", SUENO, "mal"))
    elif d_sueno > 0.8:
        c.append((0.8, "sueno", SUENO, "bien"))
    if dia["verdad_estres"] > 0.7:
        c.append((1.5 + dia["verdad_estres"], "estres", ESTRES, "alto"))
    elif dia["verdad_estres"] < -0.8:
        c.append((0.5, "estres", ESTRES, "bajo"))
    if dia["dia_semana"] < 5:
        c.append((0.6 + max(0.0, dia["verdad_estres"]), "estudio_trabajo", ESTUDIO_TRABAJO,
                  "carga" if dia["verdad_estres"] > 0 else rng.choice(["carga", "logro"])))
    if dia["verdad_ejercicio"]:
        c.append((1.6, "ejercicio", EJERCICIO, "si"))
    else:
        c.append((0.25, "ejercicio", EJERCICIO, "no"))
    if dia["verdad_pantallas"]:
        c.append((1.0, "pantallas", PANTALLAS, "si"))
    if dia["tono"] <= -1:
        c.append((1.0 + abs(dia["tono"]) * 0.5, "animo", ANIMO, "bajo"))
    elif dia["tono"] >= 1:
        c.append((0.8 + dia["tono"] * 0.4, "animo", ANIMO, "alto"))
    c.append((0.5, "alimentacion", ALIMENTACION, "x"))
    if dia["vasos_agua"] <= 2:
        c.append((0.5, "hidratacion", HIDRATACION, "poca"))
    elif dia["vasos_agua"] >= 8:
        c.append((0.5, "hidratacion", HIDRATACION, "mucha"))
    c.append((0.9 if dia["dia_semana"] >= 5 else 0.35, "social", SOCIAL, "x"))
    if dia["dia_semana"] >= 5 and dia["verdad_estres"] < 0.5:
        c.append((0.6, "descanso", DESCANSO, "si"))
    elif dia["verdad_estres"] > 1.2:
        c.append((0.3, "descanso", DESCANSO, "no"))
    return c


def _nota(dia: dict, persona: Persona, rng: random.Random) -> tuple[str, list[str], list[dict]]:
    e = persona.estilo
    cand = _candidatas(dia, persona, rng)
    n = rng.randint(1, e.frases_max)
    elegidas: list[tuple[float, str, F, str]] = []
    pool = list(cand)
    while pool and len(elegidas) < n:
        total = sum(w for w, *_ in pool)
        x, acc = rng.random() * total, 0.0
        for j, item in enumerate(pool):
            acc += item[0]
            if x <= acc:
                elegidas.append(pool.pop(j))
                break
    if rng.random() < 0.06:  # a veces la nota no dice nada temático
        elegidas = []

    partes, etiquetas, cantidades, emojis_ok = [], set(), [], []
    for _, etiqueta, grupo, clave in elegidas:
        if (etiqueta, clave) in EMOJI_COHERENTE:
            emojis_ok.extend(EMOJI_COHERENTE[(etiqueta, clave)])
        frase, extra = _elegir(grupo, clave, rng, e)
        frase, cant = _rellenar(frase, dia, rng)
        partes.append(frase)
        etiquetas.add(etiqueta)
        etiquetas.update(extra)
        cantidades.extend(cant)
    if not partes:
        partes = [rng.choice(NEUTRAS)]

    texto = rng.choice([", ", ". ", " y ", ", "]).join(partes)
    if rng.random() < e.p_muletilla:
        texto += rng.choice(MULETILLAS)
    if emojis_ok and rng.random() < e.p_emoji:
        texto += " " + rng.choice(emojis_ok)
    if rng.random() < e.p_sin_tildes:
        texto = _quitar_tildes(texto)
    if rng.random() < e.p_typo:
        texto = _typo(texto, rng)
    if rng.random() < e.p_alargar:
        texto = _alargar(texto, rng)
    if rng.random() < e.p_mayus:
        texto = texto.upper()
    elif rng.random() < 0.5:
        texto = texto[:1].upper() + texto[1:]
    return texto, sorted(etiquetas), cantidades


# ------------------------------- simulación --------------------------------------------------

def _simular_persona(p: Persona, dias: int, inicio: date, rng: random.Random) -> list[dict]:
    desfase = rng.randrange(35)
    filas = []
    estres_prev = p.base_estres
    pantallas_prev = 0
    for t in range(dias):
        estres = (
            p.a_estres * estres_prev + (1 - p.a_estres) * p.base_estres
            + 1.2 * _semana_de_pruebas(t, desfase) * (1 - p.a_estres)
            + rng.gauss(0, 0.6)
        )
        sueno = (
            p.base_sueno
            + p.efectos["estres_sueno"] * estres_prev
            + p.efectos["pantallas_sueno"] * pantallas_prev
            + rng.gauss(0, 0.7)
        )
        sueno = round(min(11.0, max(3.0, sueno)), 1)
        pantallas = int(rng.random() < min(0.95, max(0.02, p.p_pantallas + 0.15 * estres)))
        ejercicio = int(rng.random() < min(0.95, max(0.02, p.p_ejercicio - 0.10 * estres)))
        energia = 0.5 * (sueno - p.base_sueno) - 0.3 * estres + rng.gauss(0, 0.5)
        valencia = (
            -0.6 * estres + 0.3 * (sueno - p.base_sueno)
            + p.efectos["ejercicio_tono"] * ejercicio + rng.gauss(0, 0.6)
        )
        fecha = inicio + timedelta(days=t)
        dia = {
            "persona": p.id,
            "fecha": fecha.isoformat(),
            "dia": t,
            "dia_semana": fecha.weekday(),
            "sueno_horas": sueno,
            "pasos": max(0, int(p.base_pasos + 5000 * ejercicio + rng.gauss(0, 1500))),
            "vasos_agua": max(0, int(round(rng.gauss(p.media_agua, 1.5)))),
            "tono": int(max(-2, min(2, round(valencia)))),
            "verdad_estres": round(estres, 4),
            "verdad_energia": round(energia, 4),
            "verdad_ejercicio": ejercicio,
            "verdad_pantallas": pantallas,
        }
        if rng.random() < p.estilo.p_nota:
            texto, etiquetas, cantidades = _nota(dia, p, rng)
            dia.update({"texto": texto, "etiquetas": etiquetas, "cantidades": cantidades})
        else:
            dia.update({"texto": None, "etiquetas": None, "cantidades": None})
        # Los números son opcionales: no todos los días la persona los anota.
        if rng.random() > p.estilo.p_numeros:
            dia["sueno_horas_ingresado"] = None
            dia["pasos_ingresado"] = None
            dia["vasos_agua_ingresado"] = None
        else:
            dia["sueno_horas_ingresado"] = dia["sueno_horas"]
            dia["pasos_ingresado"] = dia["pasos"]
            dia["vasos_agua_ingresado"] = dia["vasos_agua"] if rng.random() < 0.7 else None
        filas.append(dia)
        estres_prev, pantallas_prev = estres, pantallas
    return filas


def generar(semilla: int = 11, personas: int = 40, dias: int = 60,
            inicio: date = date(2026, 3, 2)) -> tuple[list[dict], dict]:
    rng = random.Random(semilla)
    gente = [_crear_persona(rng, i, semilla) for i in range(personas)]
    filas: list[dict] = []
    for p in gente:
        filas.extend(_simular_persona(p, dias, inicio, random.Random(rng.getrandbits(64))))
    efectos = {
        "version": VERSION,
        "semilla": semilla,
        "descripcion": {
            "estres_sueno": "E1: estrés del día t → horas de sueño de la noche siguiente (t+1); horas por DE",
            "ejercicio_tono": "E2: ejercicio el día t → tono del mismo día; DE de valencia",
            "pantallas_sueno": "E3: pantallas de noche el día t → horas de sueño de t+1; horas",
        },
        "personas": {p.id: {"efectos": p.efectos, "estilo": asdict(p.estilo)} for p in gente},
    }
    return filas, efectos


def guardar(filas: list[dict], efectos: dict, carpeta: Path, nombre: str) -> dict:
    carpeta.mkdir(parents=True, exist_ok=True)
    datos = "".join(json.dumps(f, ensure_ascii=False) + "\n" for f in filas).encode("utf-8")
    ef = (json.dumps(efectos, ensure_ascii=False, indent=1) + "\n").encode("utf-8")
    (carpeta / f"{nombre}.jsonl").write_bytes(datos)
    (carpeta / f"{nombre}_efectos.json").write_bytes(ef)
    return {
        f"{nombre}.jsonl": {"sha256": hashlib.sha256(datos).hexdigest(), "filas": len(filas)},
        f"{nombre}_efectos.json": {"sha256": hashlib.sha256(ef).hexdigest()},
    }


if __name__ == "__main__":
    base = Path(__file__).resolve().parent
    manifiesto = {"generador": VERSION, "uso_permitido": "pipeline, motor de patrones, simulación de rutas",
                  "uso_prohibido": "reportar desempeño de comprensión de texto", "archivos": {}}
    for nombre, semilla, personas, dias in [("d0_v2", 11, 40, 60), ("d0_v2_largo", 12, 30, 120)]:
        filas, efectos = generar(semilla, personas, dias)
        manifiesto["archivos"].update(guardar(filas, efectos, base / "generado", nombre))
        notas = sum(1 for f in filas if f["texto"])
        print(f"{nombre}: {personas} personas × {dias} días, {notas} notas")
    (base / "manifiestos" / "d0_v2.json").write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
