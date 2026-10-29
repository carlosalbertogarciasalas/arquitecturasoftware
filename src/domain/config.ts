/** Singleton por módulo/proceso. Nunca almacena sesiones ni datos de clientes. */
export class DemoConfig {
  private static instance: DemoConfig | undefined;
  readonly mode = 'SIMULADO';
  readonly batchSize = 10;
  readonly leaseMs = 60_000;
  readonly maxAttempts = 3;
  private constructor() { Object.freeze(this); }
  static getInstance(): DemoConfig { return this.instance ??= new DemoConfig(); }
}
