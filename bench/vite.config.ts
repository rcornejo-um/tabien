// Build de los benchmarks: sirve los pesos de v000 como archivos estáticos.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const aqui = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: aqui('.'),
  publicDir: aqui('../ml/registry/v000'),
  build: {
    outDir: aqui('../dist/bench'),
    emptyOutDir: true,
    rollupOptions: { input: { inferencia: aqui('inferencia.html') } },
  },
});
