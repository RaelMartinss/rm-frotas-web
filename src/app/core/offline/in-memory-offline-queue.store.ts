import { Injectable } from '@angular/core';
import { OfflineQueueStore } from './offline-queue.store';
import { QueuedAction, StoredBlob } from './offline-queue.types';

@Injectable()
export class InMemoryOfflineQueueStore implements OfflineQueueStore {
  public actions = new Map<string, QueuedAction>();
  public blobs = new Map<string, StoredBlob>();

  async init(): Promise<void> {}

  async saveAction(action: QueuedAction): Promise<void> {
    // Clona o objeto para evitar mutações de referência inesperadas
    this.actions.set(action.id, JSON.parse(JSON.stringify(action)));
  }

  async getAction(id: string): Promise<QueuedAction | null> {
    const action = this.actions.get(id);
    return action ? JSON.parse(JSON.stringify(action)) : null;
  }

  async deleteAction(id: string): Promise<void> {
    this.actions.delete(id);
  }

  async getActionsByUser(userId: string): Promise<QueuedAction[]> {
    return Array.from(this.actions.values())
      .filter((a) => a.userId === userId)
      .map((a) => JSON.parse(JSON.stringify(a)));
  }

  async getAllActions(): Promise<QueuedAction[]> {
    return Array.from(this.actions.values()).map((a) =>
      JSON.parse(JSON.stringify(a)),
    );
  }

  async saveBlob(id: string, blob: Blob): Promise<void> {
    this.blobs.set(id, {
      id,
      blob,
      size: blob.size,
      mimeType: blob.type || 'application/octet-stream',
      createdAt: new Date().toISOString(),
    });
  }

  async getBlob(id: string): Promise<Blob | null> {
    const item = this.blobs.get(id);
    return item ? item.blob : null;
  }

  async deleteBlob(id: string): Promise<void> {
    this.blobs.delete(id);
  }

  async getTotalBlobsSize(): Promise<number> {
    let sum = 0;
    for (const item of this.blobs.values()) {
      sum += item.size;
    }
    return sum;
  }

  async resetSyncingToPending(): Promise<void> {
    for (const [id, action] of this.actions.entries()) {
      if (action.status === 'SYNCING') {
        action.status = 'PENDING';
        this.actions.set(id, action);
      }
    }
  }

  clear(): void {
    this.actions.clear();
    this.blobs.clear();
  }
}
