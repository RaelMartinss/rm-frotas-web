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

  private map: L.Map | null = null;
  private polyline: L.Polyline | null = null;
  private startMarker: L.Marker | null = null;
  private currentMarker: L.Marker | null = null;
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
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
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

    const latlngs: [number, number][] = pings.map((p) => [p.latitude, p.longitude]);

    // 1. Linha da Rota (Polyline)
    if (this.polyline) {
      this.polyline.setLatLngs(latlngs);
    } else {
      this.polyline = L.polyline(latlngs, {
        color: '#10b981', // Verde Esmeralda RM Frotas
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(this.map);
    }

    // 2. Marcador de Início (Origem)
    const startPoint = latlngs[0];
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

    // 3. Marcador Atual (Veículo em Trânsito)
    const latestPoint = latlngs[latlngs.length - 1];
    const latestPing = pings[pings.length - 1];
    const formattedTime = new Date(latestPing.recordedAt).toLocaleTimeString('pt-BR');

    const truckIcon = L.divIcon({
      className: 'custom-truck-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-8 rounded-full bg-emerald-500/40 animate-ping"></span>
          <div class="size-7 rounded-full bg-[#0f172a] border-2 border-emerald-400 shadow-xl flex items-center justify-center text-emerald-400">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (this.currentMarker) {
      this.currentMarker.setLatLng(latestPoint);
      this.currentMarker.setPopupContent(`
        <strong>Veículo:</strong> ${data.vehiclePlate} (${data.vehicleModel})<br/>
        <strong>Motorista:</strong> ${data.driverName}<br/>
        <strong>Último ping:</strong> ${formattedTime}
      `);
    } else {
      this.currentMarker = L.marker(latestPoint, { icon: truckIcon })
        .bindPopup(`
          <strong>Veículo:</strong> ${data.vehiclePlate} (${data.vehicleModel})<br/>
          <strong>Motorista:</strong> ${data.driverName}<br/>
          <strong>Último ping:</strong> ${formattedTime}
        `)
        .addTo(this.map);
    }

    // 4. Ajuste automático da visualização
    if (latlngs.length > 1) {
      this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
    } else {
      this.map.setView(latestPoint, 15);
    }
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
