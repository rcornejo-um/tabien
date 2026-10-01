# Etiquetado

- `index.html`: herramienta local. Ábrela en el navegador (doble clic); no necesita servidor y no envía datos.
- `muestra.py`: arma una muestra de 100 notas sintéticas (textos en un archivo y verdad del generador en otro).
- `muestra_100*.jsonl` + `acuerdo_muestra_100.json`: **foto congelada** de la prueba de la guía v1 (`decisions/005`), hecha con el generador `sintetico-v2`. Si vuelves a correr `muestra.py` con `sintetico-v2.1`, los textos salen iguales, pero algunas etiquetas del generador cambian.
- Acuerdo entre dos archivos de etiquetas:
  `env PYTHONPATH=src uv run python -m evaluacion.acuerdo A.jsonl B.jsonl`
