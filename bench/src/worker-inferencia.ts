// Worker del bench H2: la inferencia corre aquí, igual que en la app.

import { cargarTodo, medir } from './medir';

const REPETICIONES = 5;

addEventListener('message', async () => {
  try {
    const { clasificador, textos } = await cargarTodo();
    postMessage(medir('worker', clasificador, textos, REPETICIONES));
  } catch (e) {
    postMessage({ error: String(e) });
  }
});
