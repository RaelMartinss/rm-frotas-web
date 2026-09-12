import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ITripRepository } from '../../../../domain/repositories/trip.repository.interface';
import { Trip, TripRouteResponse } from '../../../../domain/models/trip.model';
import {
  LucideX,
  LucideMapPin,
  LucideNavigation,
  LucideRefreshCw,
  LucideRadio,
  LucideAlertTriangle,
} from '@lucide/angular';

@Component({
  selector: 'app-trip-map-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucideX,
    LucideMapPin,
    LucideNavigation,
    LucideRefreshCw,
    LucideRadio,
    LucideAlertTriangle,
  ],
  templateUrl: './trip-map-modal.component.html',
  styleUrl: './trip-map-modal.component.css',
})
export class TripMapModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) trip!: Trip;
  @Input() vehiclePlate?: string;
  @Input() driverName?: string;
  @Output() close = new EventEmitter<void>();

  @ViewChild('mapContainer', { static: false }) mapContainerRef!: ElementRef<HTMLDivElement>;

  private readonly tripRepository = inject(ITripRepository);

  readonly routeData = signal<TripRouteResponse | null>(null);
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isLiveTracking = computed(() => {
    return this.trip.status === 'IN_PROGRESS' || this.trip.status === 'EM_ANDAMENTO';
  });

  readonly displayVehicle = computed(() => {
    const fromRoute = this.routeData();
    if (fromRoute?.vehiclePlate) {
      return fromRoute.vehicleModel
        ? `${fromRoute.vehiclePlate} (${fromRoute.vehicleModel})`
        : fromRoute.vehiclePlate;
    }
    return this.vehiclePlate || this.trip.vehiclePlate || '-';
  });

  readonly displayDriver = computed(() => {
    return this.routeData()?.driverName || this.driverName || this.trip.driverName || '-';
  });

  private map: L.Map | null = null;
  private polyline: L.Polyline | null = null;
  private startMarker: L.Marker | null = null;
  private currentMarker: L.Marker | null = null;
  private stopMarkers: L.Marker[] = [];
  private pollInterval: any = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Pequeno delay para garantir dimensões do modal no DOM
    setTimeout(() => {
      this.initMap();
      this.loadRoute(false);
      this.startPollingIfLive();
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.clearStopMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private clearStopMarkers(): void {
    for (const marker of this.stopMarkers) {
      marker.remove();
    }
    this.stopMarkers = [];
  }

  private initMap(): void {
    if (!this.mapContainerRef || this.map) return;

    // Centro inicial padrão: Paragominas/PA (-2.9986, -47.3536) ou Brasil Central
    this.map = L.map(this.mapContainerRef.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-2.9986, -47.3536], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  loadRoute(isRefresh = false): void {
    if (!this.trip?.id) return;

    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.errorMessage.set(null);

    this.tripRepository.getTripRoute(this.trip.id).subscribe({
      next: (data) => {
        this.routeData.set(data);
        this.loading.set(false);
        this.refreshing.set(false);
        this.renderRouteOnMap(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.errorMessage.set(err.error?.message || 'Erro ao carregar os dados da rota.');
      },
    });
  }

  private renderRouteOnMap(data: TripRouteResponse): void {
    if (!this.map) return;

    // Invalida tamanho do container caso o modal tenha acabado de abrir
    this.map.invalidateSize();

    const pings = data.pings || [];
    if (pings.length === 0) return;

    // Processa os pings colapsando ruído de paradas repetitivas (anti "teia de aranha")
    const { routeLatLngs, stops } = this.processPingsForDisplay(pings);
    if (routeLatLngs.length === 0) return;

    // 1. Linha da Rota (Polyline limpa)
    if (this.polyline) {
      this.polyline.setLatLngs(routeLatLngs);
    } else {
      this.polyline = L.polyline(routeLatLngs, {
        color: '#10b981', // Verde Esmeralda RM Frotas
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(this.map);
    }

    // 2. Marcadores de Paradas (Stops)
    this.clearStopMarkers();
    for (const stop of stops) {
      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div class="size-6 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-110 transition-transform">
            P
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const stopMarker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .bindPopup(`
          <div class="p-1 text-xs">
            <strong class="text-amber-700 font-bold">🛑 Parada Detectada</strong><br/>
            <strong>Duração:</strong> ${stop.durationMinutes} min<br/>
            <strong>Período:</strong> ${stop.startTime} às ${stop.endTime}
          </div>
        `)
        .addTo(this.map);

      this.stopMarkers.push(stopMarker);
    }

    // 3. Marcador de Início (Origem)
    const startPoint = routeLatLngs[0];
    if (!this.startMarker) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `<div class="size-6 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black">A</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      this.startMarker = L.marker(startPoint, { icon: startIcon })
        .bindPopup(`<strong>Ponto Inicial:</strong> ${data.originAddress}`)
        .addTo(this.map);
    }

    // 4. Marcador Atual (Veículo em Trânsito com rotação por Heading)
    const latestPing = pings[pings.length - 1];
    const latestPoint: [number, number] = [latestPing.latitude, latestPing.longitude];
    const formattedTime = new Date(latestPing.recordedAt).toLocaleTimeString('pt-BR');

    const hasHeading = latestPing.heading !== null && latestPing.heading !== undefined;
    const isStopped =
      latestPing.movementState === 'STOPPED' ||
      (latestPing.speed !== null && latestPing.speed !== undefined && latestPing.speed < 2.5);

    const vehicleIconHtml = hasHeading
      ? `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-9 rounded-full ${isStopped ? 'bg-amber-500/30' : 'bg-emerald-500/40 animate-ping'}"></span>
          <div style="transform: rotate(${latestPing.heading}deg); transition: transform 0.3s ease;" class="size-8 rounded-full bg-[#0f172a] border-2 ${isStopped ? 'border-amber-400 text-amber-400' : 'border-emerald-400 text-emerald-400'} shadow-xl flex items-center justify-center">
            <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `
      : `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-8 rounded-full ${isStopped ? 'bg-amber-500/30' : 'bg-emerald-500/40 animate-ping'}"></span>
          <div class="size-7 rounded-full bg-[#0f172a] border-2 ${isStopped ? 'border-amber-400 text-amber-400' : 'border-emerald-400 text-emerald-400'} shadow-xl flex items-center justify-center text-emerald-400">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
        </div>
      `;

    const truckIcon = L.divIcon({
      className: 'custom-truck-marker',
      html: vehicleIconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const speedText =
      latestPing.speed !== null && latestPing.speed !== undefined
        ? `<strong>Velocidade:</strong> ${latestPing.speed} km/h<br/>`
        : '';
    const statusText = isStopped ? '🛑 Parado' : '🟢 Em movimento';

    const popupHtml = `
      <div class="p-1 text-xs">
        <strong class="text-sm font-bold text-slate-800">${data.vehiclePlate} (${data.vehicleModel})</strong><br/>
        <strong>Motorista:</strong> ${data.driverName}<br/>
        <strong>Status:</strong> ${statusText}<br/>
        ${speedText}
        <strong>Último ping:</strong> ${formattedTime}
      </div>
    `;

    if (this.currentMarker) {
      this.currentMarker.setLatLng(latestPoint);
      this.currentMarker.setIcon(truckIcon);
      this.currentMarker.setPopupContent(popupHtml);
    } else {
      this.currentMarker = L.marker(latestPoint, { icon: truckIcon })
        .bindPopup(popupHtml)
        .addTo(this.map);
    }

    // 5. Ajuste automático da visualização
    if (routeLatLngs.length > 1) {
      this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
    } else {
      this.map.setView(latestPoint, 15);
    }
  }

  /**
   * Processa pings agrupando sequências de pontos com o veículo parado,
   * eliminando a oscilação/teia de aranha da Polyline e identificando paradas.
   */
  private processPingsForDisplay(pings: any[]): {
    routeLatLngs: [number, number][];
    stops: Array<{
      latitude: number;
      longitude: number;
      durationMinutes: number;
      startTime: string;
      endTime: string;
    }>;
  } {
    if (pings.length === 0) {
      return { routeLatLngs: [], stops: [] };
    }

    const routeLatLngs: [number, number][] = [];
    const stops: Array<{
      latitude: number;
      longitude: number;
      durationMinutes: number;
      startTime: string;
      endTime: string;
    }> = [];

    let currentStoppedCluster: any[] = [];

    const flushCluster = () => {
      if (currentStoppedCluster.length === 0) return;

      const first = currentStoppedCluster[0];
      const last = currentStoppedCluster[currentStoppedCluster.length - 1];

      // Insere o ponto inicial da parada no traçado da rota
      routeLatLngs.push([first.latitude, first.longitude]);

      // Calcula duração da parada em minutos
      const startMs = new Date(first.recordedAt).getTime();
      const endMs = new Date(last.recordedAt).getTime();
      const durationMin = Math.round((endMs - startMs) / 60000);

      // Paradas de 2 minutos ou mais recebem marcador específico no mapa
      if (durationMin >= 2) {
        stops.push({
          latitude: first.latitude,
          longitude: first.longitude,
          durationMinutes: durationMin,
          startTime: new Date(first.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(last.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      }

      currentStoppedCluster = [];
    };

    for (const ping of pings) {
      const isStopped =
        ping.movementState === 'STOPPED' ||
        (ping.speed !== null && ping.speed !== undefined && ping.speed < 2.5);

      if (isStopped) {
        if (currentStoppedCluster.length > 0) {
          const anchor = currentStoppedCluster[0];
          const dist = this.calculateDistanceMeters(anchor.latitude, anchor.longitude, ping.latitude, ping.longitude);
          // Se ainda está no raio de 35m da parada, agrupa no cluster
          if (dist < 35) {
            currentStoppedCluster.push(ping);
            continue;
          } else {
            flushCluster();
          }
        }
        currentStoppedCluster.push(ping);
      } else {
        if (currentStoppedCluster.length > 0) {
          flushCluster();
        }
        routeLatLngs.push([ping.latitude, ping.longitude]);
      }
    }

    if (currentStoppedCluster.length > 0) {
      flushCluster();
    }

    return { routeLatLngs, stops };
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private startPollingIfLive(): void {
    if (!this.isLiveTracking()) return;

    this.pollInterval = setInterval(() => {
      this.loadRoute(true);
    }, 12000); // 12 segundos
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  onClose(): void {
    this.close.emit();
  }
}
