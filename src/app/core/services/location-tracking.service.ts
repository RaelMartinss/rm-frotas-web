import { inject, Injectable, signal } from '@angular/core';
import { IDriverPortalRepository } from '../../domain/repositories/driver-portal.repository.interface';
import { NetworkStatusService } from './network-status.service';

export interface LocationPingItem {
  latitude: number;
  longitude: number;
  recordedAt: string;
}

const STORAGE_QUEUE_PREFIX = 'rm_driver_location_queue_';

@Injectable({
  providedIn: 'root',
})
export class LocationTrackingService {
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly networkService = inject(NetworkStatusService);

  readonly isTracking = signal<boolean>(false);
  readonly lastLocation = signal<LocationPingItem | null>(null);
  readonly pendingPingsCount = signal<number>(0);
  readonly currentTripId = signal<string | null>(null);

  private watchId: number | null = null;
  private lastSentTime = 0;
  private lastSentPos: { lat: number; lng: number } | null = null;

  private readonly MIN_INTERVAL_MS = 15000; // 15 segundos
  private readonly MIN_DISTANCE_METERS = 30; // 30 metros

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        const tripId = this.currentTripId();
        if (tripId) {
          this.flushPendingPings(tripId);
        }
      });
    }
  }

  startTracking(tripId: string): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.warn('[LocationTracking] Geolocalização não suportada neste dispositivo.');
      return;
    }

    if (this.isTracking() && this.currentTripId() === tripId) {
      return; // Já está rastreando esta mesma viagem
    }

    this.stopTracking(); // Limpa watch anterior se houver
    this.currentTripId.set(tripId);
    this.isTracking.set(true);
    this.updatePendingCount(tripId);

    // Tenta descarregar fila acumulada anteriormente
    this.flushPendingPings(tripId);

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(tripId, pos),
      (err) => {
        console.warn('[LocationTracking] Erro ao obter posição:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
  }

  stopTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    const tripId = this.currentTripId();
    if (tripId) {
      this.flushPendingPings(tripId);
    }

    this.isTracking.set(false);
    this.currentTripId.set(null);
    this.lastSentPos = null;
    this.lastSentTime = 0;
  }

  private handlePositionUpdate(tripId: string, position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const now = Date.now();

    const elapsed = now - this.lastSentTime;
    let distance = 0;

    if (this.lastSentPos) {
      distance = this.calculateHaversineDistance(
        this.lastSentPos.lat,
        this.lastSentPos.lng,
        lat,
        lng
      );
    }

    // Throttle: envia somente se passou do intervalo mínimo OU se deslocou a distância mínima
    if (this.lastSentPos && elapsed < this.MIN_INTERVAL_MS && distance < this.MIN_DISTANCE_METERS) {
      return;
    }

    this.lastSentTime = now;
    this.lastSentPos = { lat, lng };

    const ping: LocationPingItem = {
      latitude: lat,
      longitude: lng,
      recordedAt: new Date(position.timestamp || now).toISOString(),
    };

    this.lastLocation.set(ping);

    if (this.networkService.isOnline()) {
      const queue = this.getQueue(tripId);
      const batchToSend = [...queue, ping];

      this.portalRepository.sendLocationPings(tripId, batchToSend).subscribe({
        next: () => {
          this.clearQueue(tripId);
          this.updatePendingCount(tripId);
        },
        error: (err) => {
          console.warn('[LocationTracking] Falha no envio online, salvando na fila offline:', err);
          this.enqueue(tripId, ping);
        },
      });
    } else {
      this.enqueue(tripId, ping);
    }
  }

  private flushPendingPings(tripId: string): void {
    if (!this.networkService.isOnline()) return;

    const queue = this.getQueue(tripId);
    if (queue.length === 0) return;

    this.portalRepository.sendLocationPings(tripId, queue).subscribe({
      next: () => {
        this.clearQueue(tripId);
        this.updatePendingCount(tripId);
      },
      error: (err) => {
        console.warn('[LocationTracking] Falha ao sincronizar fila offline:', err);
      },
    });
  }

  private getStorageKey(tripId: string): string {
    return `${STORAGE_QUEUE_PREFIX}${tripId}`;
  }

  private getQueue(tripId: string): LocationPingItem[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(tripId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private enqueue(tripId: string, ping: LocationPingItem): void {
    try {
      const queue = this.getQueue(tripId);
      queue.push(ping);
      // Limita fila offline a 500 pings por segurança de armazenamento
      if (queue.length > 500) {
        queue.shift();
      }
      localStorage.setItem(this.getStorageKey(tripId), JSON.stringify(queue));
      this.updatePendingCount(tripId);
    } catch (e) {
      console.error('[LocationTracking] Erro ao salvar ping na fila:', e);
    }
  }

  private clearQueue(tripId: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(tripId));
    } catch {}
  }

  private updatePendingCount(tripId: string): void {
    this.pendingPingsCount.set(this.getQueue(tripId).length);
  }

  /**
   * Calcula a distância em metros entre duas coordenadas geográficas usando a fórmula de Haversine
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
