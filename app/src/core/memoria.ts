// Repositorio en memoria: para tests y como respaldo si IndexedDB no está disponible.

import type { Fecha, RegistroDia } from './dominio';
import type { Repositorio } from './registro';

// Los registros son JSON puro, así que una copia vía JSON basta (y no depende del navegador).
const copiar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export class RepositorioMemoria implements Repositorio {
  private dias = new Map<Fecha, RegistroDia>();
  private meta = new Map<string, string>();

  async obtener(fecha: Fecha) {
    const r = this.dias.get(fecha);
    return r && copiar(r);
  }
  async guardar(r: RegistroDia) {
    this.dias.set(r.fecha, copiar(r));
  }
  async listar() {
    return [...this.dias.values()].map((r) => copiar(r)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  async borrarTodo() {
    this.dias.clear();
    this.meta.clear();
  }
  async leerMeta(clave: string) {
    return this.meta.get(clave);
  }
  async escribirMeta(clave: string, valor: string) {
    this.meta.set(clave, valor);
  }
}
