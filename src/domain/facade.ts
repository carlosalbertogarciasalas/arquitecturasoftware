import { DemoConfig } from './config';
import { DomainError, welcome, type Repository, type Session, type Snapshot, type State, type Message } from './model';
function customer(session: Session, state: State) {
  if (session.role !== 'customer') throw new DomainError('FORBIDDEN','Selecciona un perfil de cliente.');
  const profile = state.profiles.find(p => p.id === session.profileId);
  if (!profile) throw new DomainError('NOT_FOUND','Perfil no encontrado.');
  return profile;
}
function operator(session: Session) { if (session.role !== 'operator') throw new DomainError('FORBIDDEN','Esta acción corresponde al operador de demostración.'); }
const clean = (value: string, max: number) => value.trim().slice(0,max);
/** Fachada: coordina operaciones, contexto por llamada y almacenamiento transaccional. */
export class LoyaltyFacade {
  constructor(private repository: Repository, readonly config = DemoConfig.getInstance(), private now: () => number = Date.now, private uuid: () => string = () => crypto.randomUUID()) {}
  listProfiles() { return this.repository.read().then(s => s.profiles); }
  register(name: string, email: string) {
    name = clean(name,120); email = clean(email,254).toLowerCase();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError('VALIDATION','Escribe un nombre y un correo de ejemplo válido.');
    return this.repository.transaction(s => {
      if(s.profiles.some(p=>p.email===email)) throw new DomainError('CONFLICT','Ese correo ya tiene un perfil en este navegador.');
      const p = {id:this.uuid(),name,email,phone:'',version:1,createdAt:this.now()}; s.profiles.push(p); return p;
    });
  }
  async summary(session: Session): Promise<Snapshot> {
    const s=await this.repository.read(),p=customer(session,s),movements=s.movements.filter(m=>m.profileId===p.id);
    return {profile:p,points:movements.reduce((n,m)=>n+m.points,0),movements,documents:s.documents.filter(d=>d.profileId===p.id),deliveries:s.deliveries.filter(d=>d.profileId===p.id)};
  }
  updateProfile(session: Session, name: string, phone: string, version: number) {
    name=clean(name,120); phone=clean(phone,30);
    if(name.length<2) throw new DomainError('VALIDATION','El nombre necesita al menos dos caracteres.');
    return this.repository.transaction(s=>{const p=customer(session,s);if(p.version!==version) throw new DomainError('CONFLICT','El perfil cambió en otra pestaña. Actualiza antes de guardar.');p.name=name;p.phone=phone;p.version++;return p;});
  }
  importWelcome(session: Session, profileId: string) { operator(session); return this.repository.transaction(s=>welcome(s,profileId,this.now())); }
  async document(session: Session, id: string) { const s=await this.summary(session);const d=s.documents.find(d=>d.id===id);if(!d) throw new DomainError('NOT_FOUND','Comprobante no encontrado en este perfil.');return {document:d,profile:s.profile}; }
  requestDelivery(session: Session, documentId: string, key: string) {
    if(!/^[\w:-]{8,160}$/.test(key)) throw new DomainError('VALIDATION','Clave de solicitud inválida.');
    return this.repository.transaction(s=>{
      const p=customer(session,s);
      if(!s.documents.some(d=>d.id===documentId&&d.profileId===p.id)) throw new DomainError('NOT_FOUND','Comprobante no encontrado en este perfil.');
      const old=s.deliveries.find(d=>d.key===key&&d.profileId===p.id);
      if(old){if(old.documentId!==documentId) throw new DomainError('CONFLICT','La clave corresponde a otra solicitud.');return old;}
      const d={id:this.uuid(),documentId,profileId:p.id,key,state:'PENDIENTE' as const,mode:'SIMULADO' as const,createdAt:this.now()};
      s.deliveries.push(d);s.messages.push({id:this.uuid(),requestId:d.id,state:'PENDIENTE',attempts:0,availableAt:this.now(),leaseUntil:null,token:null});return d;
    });
  }
  queue(session: Session) { operator(session);return this.repository.read().then(s=>({messages:s.messages,requests:s.deliveries,results:s.results})); }
  claim(session: Session): Promise<Message[]> {
    operator(session);return this.repository.transaction(s=>{
      const now=this.now();const picked:Message[]=[];
      for(const m of s.messages){
        const eligible=(m.state==='PENDIENTE'&&m.availableAt<=now)||(m.state==='PROCESANDO'&&m.leaseUntil!==null&&m.leaseUntil<=now);
        if(!eligible) continue;
        if(m.attempts>=this.config.maxAttempts){m.state='FALLIDO';m.token=null;m.leaseUntil=null;m.error='INTENTOS_AGOTADOS';s.deliveries.find(d=>d.id===m.requestId)!.state='FALLIDO';continue;}
        if(picked.length>=this.config.batchSize) continue;
        m.attempts++;m.state='PROCESANDO';m.token=this.uuid();m.leaseUntil=now+this.config.leaseMs;picked.push({...m});
      }return picked;
    });
  }
  complete(session: Session, id: string, token: string, fail=false) {
    operator(session);return this.repository.transaction(s=>{
      const result=s.results.find(r=>r.messageId===id);
      if(result){if(result.token===token) return 'SIMULADO';throw new DomainError('STALE','La reserva ya no está vigente.');}
      const m=s.messages.find(m=>m.id===id);
      if(!m||m.state!=='PROCESANDO'||m.token!==token||m.leaseUntil===null||m.leaseUntil<=this.now()) throw new DomainError('STALE','La reserva venció. Vuelve a procesar la cola.');
      m.token=null;m.leaseUntil=null;
      const d=s.deliveries.find(d=>d.id===m.requestId)!;
      if(fail){m.error='FALLO_SIMULADO';m.state=m.attempts>=3?'FALLIDO':'PENDIENTE';m.availableAt=this.now()+(m.attempts===1?5000:30000);d.state=m.state==='FALLIDO'?'FALLIDO':'PENDIENTE';return d.state;}
      m.state='PROCESADO';delete m.error;d.state='SIMULADO';s.results.push({messageId:id,token,completedAt:this.now()});return d.state;
    });
  }
}
export interface DeliveryAdapter { send(message: Message): Promise<void>; }
export class SimulatedDeliveryAdapter implements DeliveryAdapter {
  constructor(private fail=false) {}
  async send() { await new Promise(resolve=>setTimeout(resolve,100)); if(this.fail) throw new Error('Fallo de demostración'); }
}
/** Productor y consumidor se activan en acciones distintas; nunca encolar y consumir juntos. */
export async function consume(facade: LoyaltyFacade, session: Session, adapter: DeliveryAdapter) {
  const messages=await facade.claim(session);let completed=0,failed=0,stale=0;
  for(const m of messages){let fail=false;try{await adapter.send(m);}catch{fail=true;}
    try{await facade.complete(session,m.id,m.token!,fail);if(fail)failed++;else completed++;}catch(error){if(error instanceof DomainError&&error.code==='STALE')stale++;else throw error;}
  }return {claimed:messages.length,completed,failed,stale};
}
