/** Observador local. La generación invalida respuestas de una sesión anterior. */
export class Subject<T> {
  private observers = new Set<(snapshot: T) => void>();
  private generation = 0;
  private accepted = 0;
  private issued = 0;
  constructor(private onError: () => void = () => {}) {}
  subscribe(observer: (snapshot: T) => void) { this.observers.add(observer); return () => { this.observers.delete(observer); }; }
  ticket() { return {generation: this.generation, sequence: ++this.issued}; }
  publish(value: T, ticket: ReturnType<Subject<T>['ticket']>) {
    if (ticket.generation !== this.generation || ticket.sequence < this.accepted) return false;
    this.accepted = ticket.sequence;
    for (const observer of [...this.observers]) { try { observer(value); } catch { this.onError(); } }
    return true;
  }
  clear() { this.observers.clear(); this.generation++; this.accepted = 0; }
  get size() { return this.observers.size; }
}
