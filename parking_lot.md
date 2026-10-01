# Parking lot — ideas diferidas

Ideas que aparecieron fuera de la fase en curso. Cada una indica de dónde salió y a qué fase podría ir. No se implementan hasta que su fase lo pida.

| # | Idea | Origen | Fase candidata |
|---|---|---|---|
| 1 | Bigramas de palabras ("no dormi") como features hasheadas, además de palabras y n-gramas de caracteres | F0, contrato de texto | F2 (medir si ayuda con negaciones) |
| 2 | Conservar decimales en la normalización ("7,5 horas" hoy queda "7 5 horas"). T3 extrae cantidades del texto anonimizado sin normalizar, así que no bloquea | F0, contrato de texto | F2 (si T3 lo necesita) |
| 3 | Evaluar si quitar stopwords ayuda (el pipeline v1 **no** las quita) | §6.2 | F2 |
| 4 | Teléfonos con formatos raros ("+56-9-..." con varios separadores, números fijos de regiones con códigos de 2 dígitos) | F0, anonimización | F1 (con exportaciones del piloto) |
| 5 | Nombres propios en la anonimización (T4 con NER o reglas) | §6.1 | F2 |
| 6 | Servir los pesos con Brotli en vez de gzip (suele comprimir algo mejor) | F0, H1 | F5 |
| 7 | Medir en un teléfono Android real de gama baja como contraste del perfil emulado | F0, dispositivo de referencia | F5 |
| 8 | Monitoreo de deriva: tasa de n-gramas que caen en cubetas "nunca vistas" en entrenamiento | F0, hashing | F6 |
