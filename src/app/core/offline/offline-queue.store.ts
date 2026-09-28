import { InjectionToken } from '@angular/core';
import { QueuedAction, StoredBlob } from './offline-queue.types';

export interface OfflineQueueStore {
  init(): Promise<void>;
  saveAction(action: QueuedAction): Promise<void>;
  getAction(id: string): Promise<QueuedAction | null>;
  deleteAction(id: string): Promise<void>;
  getActionsByUser(userId: string): Promise<QueuedAction[]>;
  getAllActions(): Promise<QueuedAction[]>;

  saveBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  deleteBlob(id: string): Promise<void>;
  getTotalBlobsSize(): Promise<number>;

  resetSyncingToPending(): Promise<void>;
}

export const OFFLINE_QUEUE_STORE = new InjectionToken<OfflineQueueStore>('OFFLINE_QUEUE_STORE');
