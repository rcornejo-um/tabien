// Build de la app. En modo "lt" (Limit Tests) se empaquetan los pesos de mecánica v000,
// que NO son publicables; un build normal no incluye ningún modelo.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const aqui = (p: string) => fileURLToPath(new URL(p, import.meta.url));

function pesosDeMecanica(): Plugin {
  return {
    name: 'tabien-pesos-v000',
    apply: 'build',
    generateBundle() {
      for (const archivo of ['manifest.json', 'weights.bin']) {
        this.emitFile({
          type: 'asset',
          fileName: `modelo/${archivo}`,
          source: readFileSync(aqui(`ml/registry/v000/${archivo}`)),
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: aqui('app'),
  build: {
    outDir: aqui('dist/app'),
    emptyOutDir: true,
    target: 'es2022',
  },
  plugins: mode === 'lt' ? [pesosDeMecanica()] : [],
}));
