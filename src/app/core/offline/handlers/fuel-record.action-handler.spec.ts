import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FuelRecordActionHandler } from './fuel-record.action-handler';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { QueuedAction } from '../offline-queue.types';
import { DriverFuelDTO } from '../../../domain/models/driver-portal.model';

describe('FuelRecordActionHandler', () => {
  let handler: FuelRecordActionHandler;
  let mockPortalRepo: { registerFuel: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPortalRepo = {
      registerFuel: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        FuelRecordActionHandler,
        { provide: IDriverPortalRepository, useValue: mockPortalRepo },
      ],
    });

    handler = TestBed.inject(FuelRecordActionHandler);
  });

  it('should have type "fuel-record"', () => {
    expect(handler.type).toBe('fuel-record');
  });

  it('should pass idempotencyKey and occurredAt when calling registerFuel', async () => {
    const action: QueuedAction<DriverFuelDTO> = {
      id: 'action-uuid-123',
      type: 'fuel-record',
      userId: 'user-1',
      payload: {
        vehicleId: 'veh-1',
        currentKm: 15000,
        liters: 50,
        pricePerLiter: 5.5,
        fuelType: 'DIESEL',
        occurredAt: '2026-09-28T10:00:00.000Z',
        vehiclePlate: 'ABC-1234',
        vehicleModel: 'Scania R450',
      },
      blobIds: [],
      orderingKey: 'vehicle:veh-1',
      occurredAt: '2026-09-28T10:00:00.000Z',
      createdAt: '2026-09-28T10:00:05.000Z',
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    };

    mockPortalRepo.registerFuel.mockReturnValue(
      of({ message: 'Success', id: 'fuel-1', totalCost: 275 })
    );

    await handler.execute(action, []);

    expect(mockPortalRepo.registerFuel).toHaveBeenCalledTimes(1);
    const [payloadSent, idempotencyKeySent] = mockPortalRepo.registerFuel.mock.calls[0];

    expect(idempotencyKeySent).toBe('action-uuid-123');
    expect(payloadSent.vehicleId).toBe('veh-1');
    expect(payloadSent.currentKm).toBe(15000);
    expect(payloadSent.occurredAt).toBe('2026-09-28T10:00:00.000Z');
    // Confirma que campos auxiliares da UI foram limpos
    expect((payloadSent as any).vehiclePlate).toBeUndefined();
    expect((payloadSent as any).vehicleModel).toBeUndefined();
  });

  it('should convert blob to dataUrl and attach to receiptUrl', async () => {
    const action: QueuedAction<DriverFuelDTO> = {
      id: 'action-uuid-456',
      type: 'fuel-record',
      userId: 'user-1',
      payload: {
        vehicleId: 'veh-2',
        currentKm: 20000,
        liters: 40,
        pricePerLiter: 6.0,
        fuelType: 'GASOLINA',
      },
      blobIds: ['blob-1'],
      orderingKey: 'vehicle:veh-2',
      occurredAt: '2026-09-28T11:00:00.000Z',
      createdAt: '2026-09-28T11:00:05.000Z',
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    };

    const mockBlob = new Blob(['fake image content'], { type: 'image/jpeg' });

    mockPortalRepo.registerFuel.mockReturnValue(
      of({ message: 'Success', id: 'fuel-2', totalCost: 240 })
    );

    await handler.execute(action, [mockBlob]);

    expect(mockPortalRepo.registerFuel).toHaveBeenCalledTimes(1);
    const [payloadSent] = mockPortalRepo.registerFuel.mock.calls[0];
    expect(payloadSent.receiptUrl).toBeDefined();
    expect(payloadSent.receiptUrl).toContain('data:image/jpeg;base64,');
    expect(payloadSent.occurredAt).toBe('2026-09-28T11:00:00.000Z');
  });

  it('should throw when registerFuel returns an error', async () => {
    const action: QueuedAction<DriverFuelDTO> = {
      id: 'action-uuid-err',
      type: 'fuel-record',
      userId: 'user-1',
      payload: {
        vehicleId: 'veh-3',
        currentKm: 30000,
        liters: 10,
        pricePerLiter: 5.0,
        fuelType: 'ETANOL',
      },
      blobIds: [],
      orderingKey: 'vehicle:veh-3',
      occurredAt: '2026-09-28T12:00:00.000Z',
      createdAt: '2026-09-28T12:00:05.000Z',
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    };

    const networkError = { status: 0, message: 'Network offline' };
    mockPortalRepo.registerFuel.mockReturnValue(throwError(() => networkError));

    await expect(handler.execute(action, [])).rejects.toEqual(networkError);
  });
});
