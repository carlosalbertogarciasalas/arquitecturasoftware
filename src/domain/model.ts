export type Profile = { id: string; name: string; email: string; phone: string; version: number; createdAt: number };
export type Movement = { id: string; profileId: string; points: number; label: string; createdAt: number };
export type Receipt = { id: string; profileId: string; reference: string; total: number; createdAt: number };
export type Delivery = { id: string; documentId: string; profileId: string; key: string; state: 'PENDIENTE' | 'SIMULADO' | 'FALLIDO'; mode: 'SIMULADO'; createdAt: number };
export type Message = { id: string; requestId: string; state: 'PENDIENTE' | 'PROCESANDO' | 'PROCESADO' | 'FALLIDO'; attempts: number; availableAt: number; leaseUntil: number | null; token: string | null; error?: string };
export type State = { schema: 1; profiles: Profile[]; movements: Movement[]; documents: Receipt[]; deliveries: Delivery[]; messages: Message[]; results: { messageId: string; token: string; completedAt: number }[]; imports: string[] };
export type Session = { role: 'customer'; profileId: string } | { role: 'operator' };
export type Snapshot = { profile: Profile; points: number; movements: Movement[]; documents: Receipt[]; deliveries: Delivery[] };
export class DomainError extends Error { constructor(public code: string, message: string) { super(message); this.name = 'DomainError'; } }
export interface Repository { read(): Promise<State>; transaction<T>(change: (state: State) => T): Promise<T>; }
export function welcome(state: State, profileId: string, now: number): boolean {
  const key = `welcome-v1:${profileId}`;
  if (state.imports.includes(key)) return false;
  if (!state.profiles.some(p => p.id === profileId)) throw new DomainError('NOT_FOUND', 'Perfil no encontrado.');
  state.movements.push({id: `${key}:credit`, profileId, points: 100, label: 'Compra de bienvenida · demostración', createdAt: now}, {id: `${key}:adjust`, profileId, points: -20, label: 'Ajuste de ejemplo · demostración', createdAt: now + 1});
  state.documents.push({id: `${key}:document`, profileId, reference: `DEMO-${String(state.documents.length + 1).padStart(4, '0')}`, total: 125000, createdAt: now});
  state.imports.push(key);
  return true;
}
export function initialState(now = Date.now()): State {
  const state: State = {schema:1, profiles: [{id:'demo-alicia',name:'Alicia Martínez',email:'alicia@example.test',phone:'',version:1,createdAt:now},{id:'demo-daniel',name:'Daniel Torres',email:'daniel@example.test',phone:'',version:1,createdAt:now}], movements:[],documents:[],deliveries:[],messages:[],results:[],imports:[]};
  welcome(state, 'demo-alicia', now);
  return state;
}
