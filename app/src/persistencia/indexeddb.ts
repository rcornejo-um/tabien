// Repositorio en IndexedDB. Todo queda en este dispositivo.

import type { Fecha, RegistroDia } from '../core/dominio';
import type { Repositorio } from '../core/registro';

const NOMBRE = 'tabien';
const VERSION = 1;

function promesa<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

function abrir(): Promise<IDBDatabase> {
  const req = indexedDB.open(NOMBRE, VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('dias')) db.createObjectStore('dias', { keyPath: 'fecha' });
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  };
  return promesa(req);
}

export class RepositorioIndexedDB implements Repositorio {
  private constructor(private readonly db: IDBDatabase) {}

  static async abrir(): Promise<RepositorioIndexedDB> {
    return new RepositorioIndexedDB(await abrir());
  }

  private almacen(nombre: 'dias' | 'meta', modo: IDBTransactionMode) {
    return this.db.transaction(nombre, modo).objectStore(nombre);
  }

  async obtener(fecha: Fecha) {
    return promesa<RegistroDia | undefined>(this.almacen('dias', 'readonly').get(fecha));
  }
  async guardar(r: RegistroDia) {
    await promesa(this.almacen('dias', 'readwrite').put(r));
  }
  async listar() {
    const todos = await promesa<RegistroDia[]>(this.almacen('dias', 'readonly').getAll());
    return todos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  async borrarTodo() {
    const tx = this.db.transaction(['dias', 'meta'], 'readwrite');
    tx.objectStore('dias').clear();
    tx.objectStore('meta').clear();
    await new Promise<void>((ok, mal) => {
      tx.oncomplete = () => ok();
      tx.onerror = () => mal(tx.error);
    });
  }
  async leerMeta(clave: string) {
    return promesa<string | undefined>(this.almacen('meta', 'readonly').get(clave));
  }
  async escribirMeta(clave: string, valor: string) {
    await promesa(this.almacen('meta', 'readwrite').put(valor, clave));
  }
}
