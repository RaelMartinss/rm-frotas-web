import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { OfflineQueueStore } from './offline-queue.store';
import { QueuedAction, StoredBlob } from './offline-queue.types';

const DB_NAME = 'rm_offline';
const DB_VERSION = 1;

@Injectable({
  providedIn: 'root',
})
export class IndexedDbOfflineQueueStore implements OfflineQueueStore {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // Solicita persistência de storage no Android/Chromium para reduzir risco de eviction
    if (navigator?.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    await this.getDb();
  }

  private getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB não suportado neste ambiente.'));
      }

      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('queue')) {
            const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
            queueStore.createIndex('status', 'status');
            queueStore.createIndex('orderingKey', 'orderingKey');
            queueStore.createIndex('createdAt', 'createdAt');
            queueStore.createIndex('userId', 'userId');
          }

          if (!db.objectStoreNames.contains('blobs')) {
            const blobsStore = db.createObjectStore('blobs', { keyPath: 'id' });
            blobsStore.createIndex('createdAt', 'createdAt');
          }
        },
      });
    }

    return this.dbPromise;
  }

  async saveAction(action: QueuedAction): Promise<void> {
    const db = await this.getDb();
    await db.put('queue', action);
  }

  async getAction(id: string): Promise<QueuedAction | null> {
    const db = await this.getDb();
    const action = await db.get('queue', id);
    return action ?? null;
  }

  async deleteAction(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('queue', id);
  }

  async getActionsByUser(userId: string): Promise<QueuedAction[]> {
    const db = await this.getDb();
    try {
      return await db.getAllFromIndex('queue', 'userId', userId);
    } catch {
      const all = await db.getAll('queue');
      return all.filter((a) => a.userId === userId);
    }
  }

  async getAllActions(): Promise<QueuedAction[]> {
    const db = await this.getDb();
    return db.getAll('queue');
  }

  async saveBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.getDb();
    const storedBlob: StoredBlob = {
      id,
      blob,
      size: blob.size,
      mimeType: blob.type || 'application/octet-stream',
      createdAt: new Date().toISOString(),
    };
    await db.put('blobs', storedBlob);
  }

  async getBlob(id: string): Promise<Blob | null> {
    const db = await this.getDb();
    const record: StoredBlob | undefined = await db.get('blobs', id);
    return record?.blob ?? null;
  }

  async deleteBlob(id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete('blobs', id);
  }

  async getTotalBlobsSize(): Promise<number> {
    const db = await this.getDb();
    const allBlobs: StoredBlob[] = await db.getAll('blobs');
    return allBlobs.reduce((total, item) => total + (item.size || 0), 0);
  }

  async resetSyncingToPending(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');

    let all: QueuedAction[] = [];
    try {
      all = await store.index('status').getAll('SYNCING');
    } catch {
      const everything = await store.getAll();
      all = everything.filter((item) => item.status === 'SYNCING');
    }

    for (const item of all) {
      item.status = 'PENDING';
      await store.put(item);
    }

    await tx.done;
  }
}
