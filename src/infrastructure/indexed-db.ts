import { initialState, type Repository, type State } from '../domain/model';
/** Adaptador local: transacción readwrite serializa cambios incluso entre pestañas. */
export class IndexedDbRepository implements Repository {
  private connection: Promise<IDBDatabase>;
  constructor(name = 'gmpos-clientes-demo-v1', factory: IDBFactory = indexedDB) {
    this.connection = new Promise((resolve, reject) => {
      const open = factory.open(name, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('state');
      open.onsuccess = () => { open.result.onversionchange = () => open.result.close(); resolve(open.result); };
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error('Cierra otras pestañas del prototipo y vuelve a intentar.'));
    });
  }
  async transaction<T>(change: (state: State) => T): Promise<T> {
    const db = await this.connection;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite'); const store = tx.objectStore('state');
      const request = store.get('current'); let result: T; let failure: unknown;
      request.onsuccess = () => {
        try {
          const state = (request.result ?? initialState()) as State;
          if (state.schema !== 1) throw new Error('Versión de datos no compatible.');
          result = change(state); store.put(state, 'current');
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('No se pudo guardar.'));
      tx.onerror = () => { /* onabort proporciona el error final. */ };
    });
  }
  read() { return this.transaction(state => structuredClone(state)); }
  async close() { (await this.connection).close(); }
}
