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
| 9 | Si la persona envía la nota antes de que el modelo termine de cargar: guardar la nota igual y completar "Esto entendí" cuando el modelo esté listo | F0, H4 | F5 |
| 10 | Si las colisiones de 2¹⁴ cubetas cuestan calidad con D1: probar 15 bits int8, `idf` en float16 o podar n-gramas de 5 | F0, H1 | F2 |
| 11 | Límite de largo de la nota en la UI (hoy `maxlength=2000`) y medir la latencia con notas largas reales | F0, H2 | F1 |
| 12 | Temas con polaridad para el motor de patrones (estrés alto vs calma, ánimo bajo vs alto): hoy "mencionar un tema" mezcla ambos polos y diluye la señal | F3, `decisions/007` | F2 (T2) / F3.1 |
| 13 | Mínimo de días para mostrar hallazgos: 14 es técnico; con 30 días la FDR es 0,29. Evaluar 45–60 días | F3 | Decisión de producto |
| 14 | Prior poblacional para la contracción (hoy 0): calcularlo desde D1 cuando exista | F3 | F3.1 |
| 15 | Experimentos n-de-1 (§6.7) y detección de cambios de nivel con prueba estadística (hoy las tendencias son descriptivas) | F3 | F4 |
