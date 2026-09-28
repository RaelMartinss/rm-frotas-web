import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActionHandler } from '../action-handler';
import { QueuedAction } from '../offline-queue.types';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { DriverFuelDTO } from '../../../domain/models/driver-portal.model';
import { blobToDataUrl } from '../../utils/image-compressor';

@Injectable({
  providedIn: 'root',
})
export class FuelRecordActionHandler implements ActionHandler<DriverFuelDTO> {
  readonly type = 'fuel-record';

  private readonly portalRepository = inject(IDriverPortalRepository);

  async execute(action: QueuedAction<DriverFuelDTO>, blobs: Blob[]): Promise<void> {
    const payload: DriverFuelDTO = { ...action.payload };

    // Converte o primeiro blob armazenado no IndexedDB de volta para base64 DataURL
    if (blobs && blobs.length > 0) {
      payload.receiptUrl = await blobToDataUrl(blobs[0]);
    }

    // Garante que occurredAt vá no payload caso não esteja setado
    if (!payload.occurredAt && action.occurredAt) {
      payload.occurredAt = action.occurredAt;
    }

    // Remove campos que eram apenas para exibição otimista da UI
    delete (payload as any).vehiclePlate;
    delete (payload as any).vehicleModel;

    await firstValueFrom(this.portalRepository.registerFuel(payload, action.id));
  }
}
