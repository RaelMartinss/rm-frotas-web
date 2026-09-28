import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { OfflineQueueService } from './offline-queue.service';
import { InMemoryOfflineQueueStore } from './in-memory-offline-queue.store';
import { ActionHandler } from './action-handler';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let store: InMemoryOfflineQueueStore;
  let networkStatusMock: any;
  let authStateMock: any;
  let ngZoneMock: any;

  beforeEach(() => {
    vi.useFakeTimers();

    store = new InMemoryOfflineQueueStore();

    networkStatusMock = {
      isOnline: vi.fn().mockReturnValue(true),
    };

    authStateMock = {
      currentUser: vi.fn().mockReturnValue({ id: 'user-driver-1' }),
    };

    ngZoneMock = {
      runOutsideAngular: (fn: Function) => fn(),
    };

    service = new OfflineQueueService(
      store,
      null as any,
      networkStatusMock,
      authStateMock,
      ngZoneMock,
    );
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('enqueue persiste ação e blobs; pendingCount$ reflete', async () => {
    networkStatusMock.isOnline.mockReturnValue(false); // Simula modo offline para inspecionar estado pendente
    const fakeBlob = new Blob(['foto-comprovante'], { type: 'image/jpeg' });

    const action = await service.enqueue({
      type: 'fuel-record',
      payload: { liters: 50, price: 5.5 },
      blobs: [fakeBlob],
      orderingKey: 'vehicle:123',
      occurredAt: new Date('2026-09-28T09:00:00Z'),
    });

    expect(action.id).toBeDefined();
    expect(action.userId).toBe('user-driver-1');
    expect(action.blobIds.length).toBe(1);

    const savedAction = await store.getAction(action.id);
    expect(savedAction).toBeDefined();
    expect(savedAction?.status).toBe('PENDING');

    const savedBlob = await store.getBlob(action.blobIds[0]);
    expect(savedBlob).toBeDefined();

    const pendingCount = await firstValueFrom(service.pendingCount$);
    expect(pendingCount).toBe(1);
  });

  it('flush com sucesso remove ação e blobs do store', async () => {
    const fakeBlob = new Blob(['foto-comprovante'], { type: 'image/jpeg' });
    const executedActions: any[] = [];

    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async (action, blobs) => {
        executedActions.push({ action, blobsCount: blobs.length });
      }),
    };
    service.registerHandler(mockHandler);

    const action = await service.enqueue({
      type: 'fuel-record',
      payload: { liters: 40 },
      blobs: [fakeBlob],
    });

    await service.flush();

    expect(mockHandler.execute).toHaveBeenCalledTimes(1);
    expect(executedActions[0].action.id).toBe(action.id);
    expect(executedActions[0].blobsCount).toBe(1);

    // Deve ter removido a ação e o blob do store
    const storedAction = await store.getAction(action.id);
    expect(storedAction).toBeNull();

    const storedBlob = await store.getBlob(action.blobIds[0]);
    expect(storedBlob).toBeNull();

    const pendingCount = await firstValueFrom(service.pendingCount$);
    expect(pendingCount).toBe(0);
  });

  it('Erro de rede/5xx: vai para RETRY, attempts++, nextAttemptAt respeita backoff (com fake timers)', async () => {
    let callCount = 0;
    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network timeout');
        }
      }),
    };
    service.registerHandler(mockHandler);

    const action = await service.enqueue({
      type: 'fuel-record',
      payload: { test: 1 },
    });

    await service.flush();

    const stored = await store.getAction(action.id);
    expect(stored?.status).toBe('RETRY');
    expect(stored?.attempts).toBe(1);
    expect(stored?.nextAttemptAt).toBeDefined();

    // Se tentarmos dar flush antes do tempo de backoff, não deve reexecutar
    await service.flush();
    expect(mockHandler.execute).toHaveBeenCalledTimes(1);

    // Avança o timer além do backoff da primeira tentativa (5s + jitter)
    vi.advanceTimersByTime(6000);

    // Agora deve reprocessar e ter sucesso
    await service.flush();
    expect(mockHandler.execute).toHaveBeenCalledTimes(2);

    const finalStored = await store.getAction(action.id);
    expect(finalStored).toBeNull(); // Concluído e removido
  });

  it('422: vai para DEAD e bloqueia itens seguintes da mesma orderingKey, sem bloquear outras chaves', async () => {
    const executedTypes: string[] = [];

    const mockHandler: ActionHandler = {
      type: 'test-action',
      execute: vi.fn(async (act) => {
        executedTypes.push((act.payload as any).name);
        if ((act.payload as any).name === 'A1') {
          const err: any = new Error('Validation error');
          err.status = 422;
          err.error = { message: 'Dados inválidos' };
          throw err;
        }
      }),
    };
    service.registerHandler(mockHandler);

    networkStatusMock.isOnline.mockReturnValue(false);

    // Dois itens para o veículo 1
    await service.enqueue({
      type: 'test-action',
      payload: { name: 'A1' },
      orderingKey: 'vehicle:1',
      occurredAt: new Date('2026-09-28T08:00:00Z'),
    });

    await service.enqueue({
      type: 'test-action',
      payload: { name: 'A2' },
      orderingKey: 'vehicle:1',
      occurredAt: new Date('2026-09-28T09:00:00Z'),
    });

    // Um item para o veículo 2
    await service.enqueue({
      type: 'test-action',
      payload: { name: 'B1' },
      orderingKey: 'vehicle:2',
      occurredAt: new Date('2026-09-28T08:30:00Z'),
    });

    networkStatusMock.isOnline.mockReturnValue(true);
    await service.flush();

    expect(executedTypes).toContain('A1');
    expect(executedTypes).not.toContain('A2'); // A2 bloqueado por A1 ter ficado DEAD
    expect(executedTypes).toContain('B1'); // B1 executado com sucesso (outra chave)

    const deadList = await firstValueFrom(service.dead$);
    expect(deadList.length).toBe(1);
    expect((deadList[0].payload as any).name).toBe('A1');
    expect(deadList[0].status).toBe('DEAD');
  });

  it('409 com Idempotent-Replayed conta como sucesso', async () => {
    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async () => {
        const err: any = new Error('Conflict');
        err.status = 409;
        err.headers = { 'idempotent-replayed': 'true' };
        throw err;
      }),
    };
    service.registerHandler(mockHandler);

    const action = await service.enqueue({
      type: 'fuel-record',
      payload: { ok: true },
    });

    await service.flush();

    // Deve ser tratado como sucesso e removido da store
    const stored = await store.getAction(action.id);
    expect(stored).toBeNull();
  });

  it('401 pausa a fila e não descarta nada', async () => {
    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async () => {
        const err: any = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }),
    };
    service.registerHandler(mockHandler);

    const action = await service.enqueue({
      type: 'fuel-record',
      payload: { item: 1 },
    });

    await service.flush();

    const stored = await store.getAction(action.id);
    expect(stored?.status).toBe('PENDING'); // Nunca descarta nem vira DEAD
    expect(stored?.attempts).toBe(0); // Não incrementa attempts

    // Se chamar flush de novo, não deve chamar o handler enquanto estiver pausado
    await service.flush();
    expect(mockHandler.execute).toHaveBeenCalledTimes(1);
  });

  it('Single-flight: dois flush simultâneos executam o handler apenas uma vez por item', async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;
    let finishHandlerExecution: () => void;

    const executionWaitPromise = new Promise<void>((resolve) => {
      finishHandlerExecution = resolve;
    });

    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async () => {
        activeCalls++;
        maxConcurrent = Math.max(maxConcurrent, activeCalls);
        await executionWaitPromise;
        activeCalls--;
      }),
    };
    service.registerHandler(mockHandler);

    networkStatusMock.isOnline.mockReturnValue(false);
    await service.enqueue({
      type: 'fuel-record',
      payload: { test: 'single-flight' },
    });

    networkStatusMock.isOnline.mockReturnValue(true);
    const p1 = service.flush();
    const p2 = service.flush();

    // Libera a execução
    finishHandlerExecution!();
    await Promise.all([p1, p2]);

    expect(mockHandler.execute).toHaveBeenCalledTimes(1);
    expect(maxConcurrent).toBe(1);
  });

  it('Recovery: itens SYNCING viram PENDING no bootstrap', async () => {
    // Insere item preso em SYNCING na store antes de criar o service
    await store.saveAction({
      id: 'stuck-action-1',
      type: 'fuel-record',
      userId: 'user-driver-1',
      payload: {},
      blobIds: [],
      orderingKey: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'SYNCING',
      attempts: 1,
      nextAttemptAt: null,
      lastError: null,
    });

    networkStatusMock.isOnline.mockReturnValue(false);
    const newService = new OfflineQueueService(
      store,
      null as any,
      networkStatusMock,
      authStateMock,
      ngZoneMock,
    );

    // Aguarda o init assíncrono
    await Promise.resolve();

    const recovered = await store.getAction('stuck-action-1');
    expect(recovered?.status).toBe('PENDING');

    newService.ngOnDestroy();
  });

  it('Ordem por occurredAt dentro da mesma orderingKey', async () => {
    const executedOrder: string[] = [];

    const mockHandler: ActionHandler = {
      type: 'fuel-record',
      execute: vi.fn(async (act) => {
        executedOrder.push((act.payload as any).name);
      }),
    };
    service.registerHandler(mockHandler);

    networkStatusMock.isOnline.mockReturnValue(false);

    // Enfileira A2 primeiro no tempo real, mas com occurredAt mais tarde
    await service.enqueue({
      type: 'fuel-record',
      payload: { name: 'Segundo (10:00)' },
      orderingKey: 'vehicle:truck-1',
      occurredAt: new Date('2026-09-28T10:00:00Z'),
    });

    // Enfileira A1 depois no tempo real, mas com occurredAt anterior (ex: abastecimento das 08:00)
    await service.enqueue({
      type: 'fuel-record',
      payload: { name: 'Primeiro (08:00)' },
      orderingKey: 'vehicle:truck-1',
      occurredAt: new Date('2026-09-28T08:00:00Z'),
    });

    networkStatusMock.isOnline.mockReturnValue(true);
    await service.flush();

    expect(executedOrder).toEqual([
      'Primeiro (08:00)',
      'Segundo (10:00)',
    ]);
  });

  it('Limite de 50MB de blobs recusa novo item com foto', async () => {
    const bigBlob = {
      size: 51 * 1024 * 1024,
      type: 'image/jpeg',
    } as unknown as Blob;

    await expect(
      service.enqueue({
        type: 'fuel-record',
        payload: {},
        blobs: [bigBlob],
      }),
    ).rejects.toThrow('Limite de armazenamento offline atingido (50MB)');
  });

  it('retryDead reseta item para PENDING e discard remove item e blobs', async () => {
    const mockHandler: ActionHandler = {
      type: 'test-action',
      execute: vi.fn(async () => {
        const err: any = new Error('Bad request');
        err.status = 400;
        throw err;
      }),
    };
    service.registerHandler(mockHandler);

    const action = await service.enqueue({
      type: 'test-action',
      payload: { id: 1 },
    });

    await service.flush();

    let stored = await store.getAction(action.id);
    expect(stored?.status).toBe('DEAD');

    // Testa retryDead simulando estar offline para inspecionar o status resetado
    networkStatusMock.isOnline.mockReturnValue(false);
    await service.retryDead(action.id);
    stored = await store.getAction(action.id);
    expect(stored?.status).toBe('PENDING');
    expect(stored?.attempts).toBe(0);

    // Testa discard
    await service.discard(action.id);
    stored = await store.getAction(action.id);
    expect(stored).toBeNull();
  });
});
