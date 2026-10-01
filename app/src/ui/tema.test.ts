// Contraste WCAG AA (≥ 4,5:1 texto normal) de los pares de color del tema, en claro y oscuro.
// El vidrio es translúcido: se mide contra --superficie-solida (su color equivalente sobre el cielo)
// y contra el cielo (--cielo-1 / --cielo-2), donde queda el texto fuera de las tarjetas.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./estilos.css', import.meta.url), 'utf8');

function tokens(bloque: string): Record<string, string> {
  const t: Record<string, string> = {};
  for (const m of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) t[m[1] as string] = (m[2] as string).toLowerCase();
  return t;
}

const claro = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const oscuro = { ...claro, ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('* { box-sizing'))) };

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const PARES: [string, string][] = [
  ['texto', 'superficie-solida'],
  ['texto', 'cielo-1'],
  ['texto', 'cielo-2'],
  ['texto-suave', 'superficie-solida'],
  ['texto-suave', 'cielo-1'],
  ['texto-suave', 'cielo-2'],
  ['boton-texto', 'azul'],
  ['boton-texto', 'azul-oscuro'],
  ['boton-texto', 'verde'],
  ['boton-texto', 'verde-oscuro'],
  ['peligro-texto', 'peligro'],
  ['peligro', 'superficie-solida'],
  ['enlace', 'superficie-solida'],
  ['enlace', 'cielo-1'],
  ['aviso', 'cielo-2'],
];

describe.each([
  ['claro', claro],
  ['oscuro', oscuro],
])('tema %s: contraste AA', (_, t) => {
  it.each(PARES)('%s sobre %s ≥ 4,5', (fg, bg) => {
    expect(t[fg], `falta --${fg}`).toBeDefined();
    expect(t[bg], `falta --${bg}`).toBeDefined();
    expect(contraste(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });
});
