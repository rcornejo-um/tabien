// Tipos mínimos de Node para los tests (evita agregar @types/node como dependencia).
// Solo lo que los tests usan; el código de app/src no puede importar esto.
declare module 'node:fs' {
  export function readFileSync(ruta: string | URL): Uint8Array;
  export function readFileSync(ruta: string | URL, codificacion: 'utf8'): string;
  export function existsSync(ruta: string | URL): boolean;
}
