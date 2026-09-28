export type QueuedActionStatus = 'PENDING' | 'SYNCING' | 'RETRY' | 'DEAD';

export type ActionErrorKind = 'NETWORK' | 'HTTP' | 'VALIDATION' | 'UNKNOWN';

export interface ActionError {
  kind: ActionErrorKind;
  status?: number;
  message: string;
}

export interface QueuedAction<TPayload = unknown> {
  id: string; // UUID v4 gerado no app. Vira o Idempotency-Key.
  type: string; // ex.: 'fuel-record', 'checklist', 'incident'
  userId: string; // fila é escopada por usuário logado
  payload: TPayload; // JSON serializável (sem Blob)
  blobIds: string[]; // referências em `blobs`
  orderingKey: string | null; // ex.: `vehicle:${vehicleId}` ou `trip:${tripId}`
  occurredAt: string; // ISO 8601 UTC, momento em que o motorista fez a ação
  createdAt: string; // ISO 8601 UTC, momento em que entrou na fila
  status: QueuedActionStatus;
  attempts: number;
  nextAttemptAt: string | null; // ISO 8601 UTC para retry com backoff
  lastError: ActionError | null;
}

export interface StoredBlob {
  id: string;
  blob: Blob;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface EnqueueInput<T = unknown> {
  type: string;
  payload: T;
  blobs?: Blob[];
  orderingKey?: string | null;
  occurredAt?: Date | string;
}

