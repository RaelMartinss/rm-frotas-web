import { QueuedAction } from './offline-queue.types';

export interface ActionHandler<TPayload = any> {
  readonly type: string;

  /**
   * Executa o envio real para a API.
   * O handler DEVE repassar `action.id` no header `Idempotency-Key`.
   * Recebe os Blobs carregados do IndexedDB correspondentes a `action.blobIds`.
   */
  execute(action: QueuedAction<TPayload>, blobs: Blob[]): Promise<void>;
}
