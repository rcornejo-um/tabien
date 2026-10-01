// Paso 1 del contrato texto-v1: anonimizar correos, RUT y teléfonos.
// Sin \w, \d ni \b: en JS son ASCII y en Python Unicode (ver spec/texto.md).

const PATRONES: ReadonlyArray<readonly [RegExp, string]> = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '<email>'],
  [/(?<![A-Za-z0-9_.])[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK](?![A-Za-z0-9_])/g, '<rut>'],
  [
    /(?<![A-Za-z0-9_+])(?:\+?56[ .-]?)?[29][ .-]?[0-9]{4}[ .-]?[0-9]{4}(?![A-Za-z0-9_])/g,
    '<telefono>',
  ],
];

export function anonimizar(texto: string): string {
  for (const [patron, etiqueta] of PATRONES) {
    texto = texto.replace(patron, etiqueta);
  }
  return texto;
}
