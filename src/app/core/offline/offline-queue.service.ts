import { Injectable, Inject, Optional, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  QueuedAction,
  QueuedActionStatus,
  EnqueueInput,
  ActionError,
} from './offline-queue.types';
import { ActionHandler } from './action-handler';
import { OFFLINE_QUEUE_STORE, OfflineQueueStore } from './offline-queue.store';
import { IndexedDbOfflineQueueStore } from './indexeddb-offline-queue.store';
import { NetworkStatusService } from '../services/network-status.service';
import { AuthStateService } from '../services/auth-state.service';

const MAX_BLOBS_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

// Backoff exponencial com teto em 5 minutos
const BACKOFF_DELAYS_MS = [
  5 * 1000, // 1ª tentativa: 5s
  15 * 1000, // 2ª tentativa: 15s
  45 * 1000, // 3ª tentativa: 45s
  2 * 60 * 1000, // 4ª tentativa: 2min
  5 * 60 * 1000, // 5ª+ tentativa: 5min
];

@Injectable({
  providedIn: 'root',
})
export class OfflineQueueService implements OnDestroy {
  private readonly handlers = new Map<string, ActionHandler>();
  private readonly store: OfflineQueueStore;

  private readonly actionsSubject = new BehaviorSubject<QueuedAction[]>([]);
  public readonly actions$ = this.actionsSubject.asObservable();

  public readonly pending$: Observable<QueuedAction[]> = this.actions$.pipe(
    map((actions) =>
      actions.filter(
        (a) =>
          a.status === 'PENDING' ||
          a.status === 'SYNCING' ||
          a.status === 'RETRY',
      ),
    ),
  );

  public readonly dead$: Observable<QueuedAction[]> = this.actions$.pipe(
    map((actions) => actions.filter((a) => a.status === 'DEAD')),
  );

  public readonly pendingCount$: Observable<number> = this.pending$.pipe(
    map((items) => items.length),
  );

  private currentFlushPromise: Promise<void> | null = null;
  private hasPendingFlushRequest = false;
  private isPaused = false;
  private periodicTimer: any = null;
  private onlineListenerCleanup: (() => void) | null = null;
  private appStateListenerCleanup: (() => void) | null = null;

  constructor(
    @Optional()
    @Inject(OFFLINE_QUEUE_STORE)
    injectedStore: OfflineQueueStore | null,
    defaultStore: IndexedDbOfflineQueueStore,
    private readonly networkStatus: NetworkStatusService,
    private readonly authState: AuthStateService,
    private readonly ngZone: NgZone,
  ) {
    this.store = injectedStore ?? defaultStore;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.store.init();
      await this.store.resetSyncingToPending();
      await this.refreshState();

      this.setupListeners();

      if (this.isOnline()) {
        void this.flush();
      }
    } catch (err) {
      console.warn('Falha na inicialização do OfflineQueueService:', err);
    }
  }

  private setupListeners(): void {
    if (typeof window !== 'undefined') {
      const onlineHandler = () => {
        this.isPaused = false;
        void this.flush();
      };
      window.addEventListener('online', onlineHandler);
      this.onlineListenerCleanup = () =>
        window.removeEventListener('online', onlineHandler);
    }

    if (Capacitor.isPluginAvailable('App')) {
      try {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            this.isPaused = false;
            void this.flush();
          }
        }).then((handle) => {
          this.appStateListenerCleanup = () => handle.remove();
        }).catch(() => {});
      } catch {}
    }

    // Timer periódico de 30 segundos
    this.ngZone.runOutsideAngular(() => {
      this.periodicTimer = setInterval(() => {
        if (this.isOnline() && !this.isPaused) {
          void this.flush();
        }
      }, 30000);
    });
  }

  public registerHandler(handler: ActionHandler): void {
    this.handlers.set(handler.type, handler);
  }

  public async enqueue<T>(input: EnqueueInput<T>): Promise<QueuedAction<T>> {
    const currentUserId = this.getCurrentUserId();
    const blobs = input.blobs ?? [];

    // Validação de limite de 50MB
    if (blobs.length > 0) {
      const incomingSize = blobs.reduce((sum, b) => sum + b.size, 0);
      const currentSize = await this.store.getTotalBlobsSize();
      if (currentSize + incomingSize > MAX_BLOBS_TOTAL_SIZE) {
        throw new Error(
          'Limite de armazenamento offline atingido (50MB). Envie os itens pendentes antes de registrar novas fotos.',
        );
      }
    }

    const actionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'action-' + Math.random().toString(36).substring(2, 15) + Date.now();

    const blobIds: string[] = [];
    for (let i = 0; i < blobs.length; i++) {
      const blobId = `${actionId}-blob-${i}`;
      await this.store.saveBlob(blobId, blobs[i]);
      blobIds.push(blobId);
    }

    const queuedAction: QueuedAction<T> = {
      id: actionId,
      type: input.type,
      userId: currentUserId,
      payload: input.payload,
      blobIds,
      orderingKey: input.orderingKey ?? null,
      occurredAt: (input.occurredAt ?? new Date()).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    };

    await this.store.saveAction(queuedAction as QueuedAction);
    await this.refreshState();

    if (this.isOnline() && !this.isPaused) {
      void this.flush();
    }

    return queuedAction;
  }

  /**
   * Executa a sincronização da fila.
   * Single-flight: reaproveita a Promise em andamento se já houver um flush em execução.
   */
  public flush(): Promise<void> {
    if (this.currentFlushPromise) {
      this.hasPendingFlushRequest = true;
      return this.currentFlushPromise;
    }

    this.currentFlushPromise = this.runFlushLoop().finally(() => {
      this.currentFlushPromise = null;
    });

    return this.currentFlushPromise;
  }

  private async runFlushLoop(): Promise<void> {
    do {
      this.hasPendingFlushRequest = false;
      await this.doFlush();
    } while (this.hasPendingFlushRequest && this.isOnline() && !this.isPaused);
  }

  private async doFlush(): Promise<void> {
    if (!this.isOnline() || this.isPaused) {
      return;
    }

    const currentUserId = this.getCurrentUserId();
    const userActions = await this.store.getActionsByUser(currentUserId);

    if (userActions.length === 0) {
      return;
    }

    // Agrupa por orderingKey
    const groups = new Map<string, QueuedAction[]>();

    for (const action of userActions) {
      const key = action.orderingKey ?? `__standalone_${action.id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(action);
    }

    const now = Date.now();

    // Processa os grupos independentemente
    for (const [groupKey, actions] of groups.entries()) {
      if (this.isPaused) break;

      // Ordena rigorosamente por occurredAt ASC e createdAt ASC
      actions.sort((a, b) => {
        const timeA = new Date(a.occurredAt).getTime();
        const timeB = new Date(b.occurredAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Se houver qualquer item DEAD nesta orderingKey, ela é bloqueada até o usuário resolver
      const hasDeadItem = actions.some((a) => a.status === 'DEAD');
      if (hasDeadItem) {
        continue;
      }

      // Envia os itens elegíveis um por vez
      for (const action of actions) {
        if (this.isPaused) break;

        const isRetry = action.status === 'RETRY';
        const isPending = action.status === 'PENDING';

        if (!isPending && !isRetry) {
          continue;
        }

        // Se estiver em RETRY, checa se já expirou o backoff
        if (isRetry && action.nextAttemptAt) {
          const nextAttemptTime = new Date(action.nextAttemptAt).getTime();
          if (now < nextAttemptTime) {
            // Ainda em espera pelo backoff; interrompe este grupo
            break;
          }
        }

        const success = await this.processAction(action);
        if (!success) {
          // Se falhou, interrompe os seguintes desta orderingKey
          break;
        }
      }
    }

    await this.refreshState();
  }

  private async processAction(action: QueuedAction): Promise<boolean> {
    const handler = this.handlers.get(action.type);
    if (!handler) {
      action.status = 'DEAD';
      action.lastError = {
        kind: 'UNKNOWN',
        message: `Nenhum handler registrado para a ação '${action.type}'.`,
      };
      await this.store.saveAction(action);
      return false;
    }

    action.status = 'SYNCING';
    await this.store.saveAction(action);
    await this.refreshState();

    const blobs: Blob[] = [];
    for (const blobId of action.blobIds) {
      const blob = await this.store.getBlob(blobId);
      if (blob) {
        blobs.push(blob);
      }
    }

    try {
      await handler.execute(action, blobs);

      // Sucesso confirmado: remove ação e blobs do IndexedDB
      for (const blobId of action.blobIds) {
        await this.store.deleteBlob(blobId).catch(() => {});
      }
      await this.store.deleteAction(action.id);
      return true;
    } catch (err: any) {
      return this.handleExecutionError(action, err);
    }
  }

  private async handleExecutionError(
    action: QueuedAction,
    err: any,
  ): Promise<boolean> {
    const status = err?.status ?? err?.statusCode;
    const isReplayed =
      err?.headers?.get?.('Idempotent-Replayed') === 'true' ||
      err?.headers?.['idempotent-replayed'] === 'true' ||
      err?.error?.idempotentReplayed === true;

    // HTTP 409 com Idempotent-Replayed conta como sucesso (já foi processado pelo servidor)
    if (status === 409 && isReplayed) {
      for (const blobId of action.blobIds) {
        await this.store.deleteBlob(blobId).catch(() => {});
      }
      await this.store.deleteAction(action.id);
      return true;
    }

    // HTTP 401: Pausa a fila inteira, não incrementa attempts nem descarta nada
    if (status === 401) {
      this.isPaused = true;
      action.status = 'PENDING';
      action.lastError = {
        kind: 'HTTP',
        status: 401,
        message: 'Sessão expirada. Faça login novamente para sincronizar.',
      };
      await this.store.saveAction(action);
      return false;
    }

    // Erros definitivos de validação: 400, 404, 422 ou 409 sem replay
    if (
      status === 400 ||
      status === 404 ||
      status === 422 ||
      (status === 409 && !isReplayed)
    ) {
      action.status = 'DEAD';
      action.lastError = {
        kind: 'VALIDATION',
        status,
        message:
          err?.error?.message ||
          err?.message ||
          'Erro permanente de validação nos dados enviados.',
      };
      await this.store.saveAction(action);
      return false;
    }

    // Erro 5xx com mais de 20 tentativas: vira DEAD
    const isServerError = typeof status === 'number' && status >= 500;
    if (isServerError && action.attempts >= 20) {
      action.status = 'DEAD';
      action.lastError = {
        kind: 'HTTP',
        status,
        message: 'Limite de 20 tentativas atingido para erro do servidor (5xx).',
      };
      await this.store.saveAction(action);
      return false;
    }

    // Erros transientes (Sem rede, timeout, 5xx, 429): RETRY com backoff exponencial + jitter
    action.status = 'RETRY';
    action.attempts += 1;

    const delayIndex = Math.min(action.attempts - 1, BACKOFF_DELAYS_MS.length - 1);
    const baseDelay = BACKOFF_DELAYS_MS[delayIndex];
    // Jitter entre -10% e +10%
    const jitter = baseDelay * (0.9 + Math.random() * 0.2);
    const nextAttemptAt = new Date(Date.now() + jitter);

    action.nextAttemptAt = nextAttemptAt.toISOString();
    action.lastError = {
      kind: status ? 'HTTP' : 'NETWORK',
      status,
      message: err?.message || 'Falha de conexão com a rede ou timeout.',
    };

    await this.store.saveAction(action);
    return false;
  }

  public async retryDead(id: string): Promise<void> {
    const action = await this.store.getAction(id);
    if (!action || action.status !== 'DEAD') {
      return;
    }

    action.status = 'PENDING';
    action.attempts = 0;
    action.nextAttemptAt = null;
    action.lastError = null;

    await this.store.saveAction(action);
    await this.refreshState();

    if (this.isOnline()) {
      this.isPaused = false;
      void this.flush();
    }
  }

  public async discard(id: string): Promise<void> {
    const action = await this.store.getAction(id);
    if (!action) {
      return;
    }

    for (const blobId of action.blobIds) {
      await this.store.deleteBlob(blobId).catch(() => {});
    }

    await this.store.deleteAction(id);
    await this.refreshState();
  }

  public async refreshState(): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    const actions = await this.store.getActionsByUser(currentUserId);
    this.actionsSubject.next(actions);
  }

  private getCurrentUserId(): string {
    return this.authState.currentUser()?.id || 'anonymous-user';
  }

  private isOnline(): boolean {
    return this.networkStatus.isOnline();
  }

  ngOnDestroy(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
    }
    if (this.onlineListenerCleanup) {
      this.onlineListenerCleanup();
    }
    if (this.appStateListenerCleanup) {
      this.appStateListenerCleanup();
    }
  }
}
