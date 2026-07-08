export interface AuraEvent<T = void> {
  readonly type: string
  readonly payload: T
  readonly timestamp: number
}

export interface IEventBus {
  emit<T>(event: AuraEvent<T>): void
  on<T>(type: string, handler: (event: AuraEvent<T>) => void): () => void
  off<T>(type: string, handler: (event: AuraEvent<T>) => void): void
}
