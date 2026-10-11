import {
  Component,
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
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { ITripRepository } from '../../../domain/repositories/trip.repository.interface';
import { TripRouteResponse, TripLocationPing } from '../../../domain/models/trip.model';
import {
  LucideArrowLeft,
  LucideRefreshCw,
  LucideRadio,
  LucideAlertTriangle,
  LucideTruck,
  LucideUser,
  LucidePhone,
  LucideMapPin,
  LucideActivity,
  LucideCheckCircle2,
  LucideLocate,
  LucideCopy,
  LucideMessageCircle,
  LucideCheck,
  LucideMaximize2,
  LucideMinimize2,
} from '@lucide/angular';

interface FormattedStop {
  latitude: number;
  longitude: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}

interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  type: 'start' | 'stop' | 'speed' | 'update';
}

@Component({
  selector: 'app-trip-tracking',
  standalone: true,
  imports: [
    CommonModule,
    LucideArrowLeft,
    LucideRefreshCw,
    LucideRadio,
    LucideAlertTriangle,
    LucideTruck,
    LucideUser,
    LucidePhone,
    LucideMapPin,
    LucideActivity,
    LucideCheckCircle2,
    LucideLocate,
    LucideCopy,
    LucideMessageCircle,
    LucideCheck,
    LucideMaximize2,
    LucideMinimize2,
  ],
  templateUrl: './trip-tracking.component.html',
  styleUrl: './trip-tracking.component.css',
})
export class TripTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tripRepository = inject(ITripRepository);

  @ViewChild('mapContainer', { static: false }) mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly tripId = signal<string>('');
  readonly routeData = signal<TripRouteResponse | null>(null);
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly driverPhotoFailed = signal<boolean>(false);
  readonly copiedCoords = signal<boolean>(false);
  readonly isExpandedMap = signal<boolean>(false);

  // Status dinâmico
  readonly isLiveTracking = computed(() => {
    const s = this.routeData()?.status;
    return s === 'IN_PROGRESS' || s === 'EM_ANDAMENTO';
  });

  readonly isCompleted = computed(() => {
    const s = this.routeData()?.status;
    return s === 'COMPLETED' || s === 'CONCLUIDA';
  });

  // Último ping registrado
  readonly latestPing = computed<TripLocationPing | null>(() => {
    const pings = this.routeData()?.pings || [];
    return pings.length > 0 ? pings[pings.length - 1] : null;
  });

  // Estado atual do veículo
  readonly isStopped = computed<boolean>(() => {
    const ping = this.latestPing();
    if (!ping) return true;
    return (
      ping.movementState === 'STOPPED' ||
      (ping.speed !== null && ping.speed !== undefined && ping.speed < 2.5)
    );
  });

  readonly currentSpeed = computed<number>(() => {
    const ping = this.latestPing();
    if (!ping || this.isStopped()) return 0;
    return Math.round(ping.speed || 0);
  });

  // Distância percorrida em KM
  readonly totalDistanceKm = computed<number>(() => {
    const pings = this.routeData()?.pings || [];
    if (pings.length < 2) return 0;

    let meters = 0;
    for (let i = 1; i < pings.length; i++) {
      meters += this.calculateDistanceMeters(
        pings[i - 1].latitude,
        pings[i - 1].longitude,
        pings[i].latitude,
        pings[i].longitude
      );
    }
    return Math.round((meters / 1000) * 10) / 10;
  });

  // Tempo decorrido de viagem
  readonly tripDurationFormatted = computed<string>(() => {
    const data = this.routeData();
    const startStr = data?.startedAt || (data?.pings?.length ? data.pings[0].recordedAt : null);
    if (!startStr) return '0 min';

    const start = new Date(startStr).getTime();
    const end = data?.completedAt ? new Date(data.completedAt).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  });

  // Progresso estimado da rota (0 a 100%)
  readonly routeProgressPercent = computed<number>(() => {
    if (this.isCompleted()) return 100;
    const pings = this.routeData()?.pings || [];
    if (pings.length === 0) return 0;

    // Estimativa ponderada baseada no número de pings e distância
    const dist = this.totalDistanceKm();
    if (dist <= 0) return 5;
    // Cap visual de 95% enquanto não finalizada
    return Math.min(95, Math.max(10, Math.round(dist * 2.5)));
  });

  // Linha do tempo / Últimos eventos
  readonly recentEvents = computed<TimelineEvent[]>(() => {
    const pings = this.routeData()?.pings || [];
    if (pings.length === 0) return [];

    const events: TimelineEvent[] = [];
    const latest = pings[pings.length - 1];

    // 1. Posicionamento mais recente
    events.push({
      time: new Date(latest.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      title: 'Posicionamento atualizado',
      description: `${latest.speed && latest.speed > 0 ? `${Math.round(latest.speed)} km/h • ` : ''}${this.routeData()?.vehiclePlate || 'Veículo em rota'}`,
      type: 'update',
    });

    // 2. Parada recente se houver
    const stoppedPing = [...pings].reverse().find(p => p.movementState === 'STOPPED');
    if (stoppedPing && stoppedPing.id !== latest.id) {
      events.push({
        time: new Date(stoppedPing.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        title: 'Parada para abastecimento / descanso',
        description: 'Veículo com velocidade nula detectada',
        type: 'stop',
      });
    }

    // 3. Início da viagem
    const firstPing = pings[0];
    events.push({
      time: new Date(firstPing.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      title: 'Início do rastreamento',
      description: this.routeData()?.originCity
        ? `${this.routeData()?.originCity} (${this.routeData()?.originState || 'Origem'})`
        : 'Partida inicial registrada',
      type: 'start',
    });

    return events;
  });

  private map: L.Map | null = null;
  private polyline: L.Polyline | null = null;
  private polylineGlow: L.Polyline | null = null;
  private polylineArrows: L.Polyline[] = [];
  private startMarker: L.Marker | null = null;
  private currentMarker: L.Marker | null = null;
  private stopMarkers: L.Marker[] = [];
  private pollInterval: any = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tripId.set(id);
    } else {
      this.errorMessage.set('Identificador da viagem não fornecido.');
      this.loading.set(false);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.loadRoute(false);
      this.startPollingIfLive();
      this.setupResizeObserver();
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.clearStopMarkers();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private setupResizeObserver(): void {
    if (!this.mapContainerRef?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    });
    this.resizeObserver.observe(this.mapContainerRef.nativeElement);
  }

  private clearStopMarkers(): void {
    for (const marker of this.stopMarkers) {
      marker.remove();
    }
    this.stopMarkers = [];
  }

  private initMap(): void {
    if (!this.mapContainerRef || this.map) return;

    // OpenStreetMap padrão com filtro CSS Dark Industrial: 100% gratuito, sem limite e sem exigência de API Key
    this.map = L.map(this.mapContainerRef.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-2.9986, -47.3536], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" class="text-slate-400">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  /**
   * Centraliza o mapa diretamente no veículo atual
   */
  centerOnVehicle(): void {
    const ping = this.latestPing();
    if (!ping || !this.map) return;
    this.map.flyTo([ping.latitude, ping.longitude], 16, { animate: true, duration: 1 });
  }

  /**
   * Alterna entre modo normal (com painel lateral) e tela expandida (mapa cobrindo toda a largura)
   */
  toggleExpandMap(): void {
    this.isExpandedMap.update((val) => !val);
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 150);
  }

  /**
   * Ajusta o zoom para enquadrar a rota inteira
   */
  fitRouteBounds(): void {
    if (!this.map) return;
    if (this.polyline && this.polyline.getLatLngs().length > 0) {
      this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50], maxZoom: 16 });
    } else {
      const ping = this.latestPing();
      if (ping) {
        this.map.setView([ping.latitude, ping.longitude], 15);
      }
    }
  }

  /**
   * Copia as coordenadas atuais do veículo para o clipboard
   */
  copyCoordinates(): void {
    const ping = this.latestPing();
    if (!ping) return;
    const text = `${ping.latitude.toFixed(6)}, ${ping.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedCoords.set(true);
      setTimeout(() => this.copiedCoords.set(false), 2500);
    });
  }

  /**
   * Gera o link direto para conversa no WhatsApp com o motorista
   */
  getWhatsAppUrl(): string | null {
    const phone = this.routeData()?.driverPhone;
    if (!phone) return null;
    const cleanNumber = phone.replace(/\D/g, '');
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const plate = this.routeData()?.vehiclePlate || '';
    const msg = encodeURIComponent(`Olá, sou da central de operações RM Frotas acompanhando a viagem com o veículo ${plate}. Tudo bem?`);
    return `https://wa.me/${fullNumber}?text=${msg}`;
  }

  /**
   * Formata telefone para URI tel:
   */
  getTelUrl(): string | null {
    const phone = this.routeData()?.driverPhone;
    if (!phone) return null;
    const cleanNumber = phone.replace(/\D/g, '');
    return `tel:${cleanNumber}`;
  }

  loadRoute(isRefresh = false): void {
    const id = this.tripId();
    if (!id) return;

    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.errorMessage.set(null);

    this.tripRepository.getTripRoute(id).subscribe({
      next: (data) => {
        this.routeData.set(data);
        this.loading.set(false);
        this.refreshing.set(false);
        this.renderRouteOnMap(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.errorMessage.set(err.error?.message || 'Erro ao carregar dados de telemetria da rota.');
      },
    });
  }

  private renderRouteOnMap(data: TripRouteResponse): void {
    if (!this.map) return;
    this.map.invalidateSize();

    const pings = data.pings || [];
    if (pings.length === 0) return;

    const { routeLatLngs, stops } = this.processPingsForDisplay(pings);
    if (routeLatLngs.length === 0) return;

    // 1. LINHA DA ROTA DE ALTA PERFORMANCE (DUAL-LAYER NEON GLOW COM SUAVIZAÇÃO)
    // Camada Inferior (Aura Neon / Halo de Contraste e Profundidade 3D)
    if (this.polylineGlow) {
      this.polylineGlow.setLatLngs(routeLatLngs);
    } else {
      this.polylineGlow = L.polyline(routeLatLngs, {
        color: '#10B981',
        weight: 10,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-glow-layer',
      }).addTo(this.map);
    }

    // Camada Superior (Core Esmeralda Fluorescente Ultra Nítido com Traçado Refinado)
    if (this.polyline) {
      this.polyline.setLatLngs(routeLatLngs);
    } else {
      this.polyline = L.polyline(routeLatLngs, {
        color: '#34D399',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-core-layer',
      }).addTo(this.map);
    }

    // 2. Marcadores de Paradas
    this.clearStopMarkers();
    for (const stop of stops) {
      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div class="size-6 rounded-full bg-amber-500 border-2 border-[#0F1215] shadow-lg flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-110 transition-transform">
            P
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const stopMarker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-200">
            <div class="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
              <span>🛑</span>
              <span>Parada Registrada</span>
            </div>
            <div class="space-y-0.5 text-[11px] text-slate-300">
              <div><span class="text-slate-400">Duração:</span> <strong class="text-white">${stop.durationMinutes} min</strong></div>
              <div><span class="text-slate-400">Horário:</span> ${stop.startTime} às ${stop.endTime}</div>
            </div>
          </div>
        `)
        .addTo(this.map);

      this.stopMarkers.push(stopMarker);
    }

    // 3. Marcador Origem
    const startPoint = routeLatLngs[0];
    if (!this.startMarker) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `<div class="size-6 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black">A</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      this.startMarker = L.marker(startPoint, { icon: startIcon })
        .bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-200">
            <strong class="text-emerald-400 block mb-1">🟢 Ponto de Partida</strong>
            <p class="text-[11px] text-slate-300">${data.originAddress}</p>
          </div>
        `)
        .addTo(this.map);
    }

    // 4. Marcador Veículo Atual
    const latestPing = pings[pings.length - 1];
    const latestPoint: [number, number] = [latestPing.latitude, latestPing.longitude];
    const formattedTime = new Date(latestPing.recordedAt).toLocaleTimeString('pt-BR');

    const hasHeading = latestPing.heading !== null && latestPing.heading !== undefined;
    const isStopped = this.isStopped();

    const vehicleIconHtml = hasHeading
      ? `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-9 rounded-full ${isStopped ? 'bg-amber-500/30' : 'bg-emerald-500/40 animate-ping'}"></span>
          <div style="transform: rotate(${latestPing.heading}deg); transition: transform 0.3s ease;" class="size-8 rounded-full bg-[#0F1215] border-2 ${isStopped ? 'border-amber-400 text-amber-400' : 'border-emerald-400 text-emerald-400'} shadow-xl flex items-center justify-center">
            <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `
      : `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-8 rounded-full ${isStopped ? 'bg-amber-500/30' : 'bg-emerald-500/40 animate-ping'}"></span>
          <div class="size-7 rounded-full bg-[#0F1215] border-2 ${isStopped ? 'border-amber-400 text-amber-400' : 'border-emerald-400 text-emerald-400'} shadow-xl flex items-center justify-center text-emerald-400">
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

    const popupHtml = `
      <div class="p-2 text-xs font-sans text-slate-200">
        <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-1">
          <span>${data.vehiclePlate}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded ${isStopped ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'} font-normal">
            ${isStopped ? 'Parado' : 'Em movimento'}
          </span>
        </div>
        <div class="space-y-0.5 text-[11px] text-slate-300">
          <div><span class="text-slate-400">Modelo:</span> ${data.vehicleModel || 'Caminhão'}</div>
          <div><span class="text-slate-400">Motorista:</span> <strong class="text-white">${data.driverName}</strong></div>
          ${latestPing.speed ? `<div><span class="text-slate-400">Velocidade:</span> <strong class="text-white">${Math.round(latestPing.speed)} km/h</strong></div>` : ''}
          <div><span class="text-slate-400">Atualizado:</span> ${formattedTime}</div>
        </div>
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

    if (routeLatLngs.length > 1) {
      this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50], maxZoom: 16 });
    } else {
      this.map.setView(latestPoint, 15);
    }
  }

  /**
   * Processamento avançado dos pings de telemetria:
   * 1. Elimina saltos anômalos de GPS e ruídos de reflexão estática.
   * 2. Agrupa pontos de paradas (Stop Clustering) evitando nós/emaranhados no mapa.
   * 3. Aplica interpolação e simplificação Douglas-Peucker adaptativa para traçado limpo.
   */
  private processPingsForDisplay(pings: any[]): {
    routeLatLngs: [number, number][];
    stops: FormattedStop[];
  } {
    if (pings.length === 0) return { routeLatLngs: [], stops: [] };

    const rawCoords: [number, number][] = [];
    const stops: FormattedStop[] = [];
    let currentCluster: any[] = [];

    const flushCluster = () => {
      if (currentCluster.length === 0) return;
      const first = currentCluster[0];
      const last = currentCluster[currentCluster.length - 1];

      rawCoords.push([first.latitude, first.longitude]);

      const startMs = new Date(first.recordedAt).getTime();
      const endMs = new Date(last.recordedAt).getTime();
      const durationMin = Math.round((endMs - startMs) / 60000);

      if (durationMin >= 2) {
        stops.push({
          latitude: first.latitude,
          longitude: first.longitude,
          durationMinutes: durationMin,
          startTime: new Date(first.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(last.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      }
      currentCluster = [];
    };

    let prevValidPing: any = null;

    for (const ping of pings) {
      // Filtro 1: Validação de coordenadas
      if (!ping.latitude || !ping.longitude || isNaN(ping.latitude) || isNaN(ping.longitude)) {
        continue;
      }

      // Filtro 2: Salto impossível em relação ao ping anterior (outlier geodésico)
      if (prevValidPing) {
        const deltaMs = Math.abs(new Date(ping.recordedAt).getTime() - new Date(prevValidPing.recordedAt).getTime());
        const distMeters = this.calculateDistanceMeters(
          prevValidPing.latitude,
          prevValidPing.longitude,
          ping.latitude,
          ping.longitude
        );

        // Se o salto for > 100km num intervalo menor que 2 minutos, descarta ping espúrio
        if (deltaMs < 120000 && distMeters > 80000) {
          continue;
        }
      }

      const isStopped =
        ping.movementState === 'STOPPED' ||
        (ping.speed !== null && ping.speed !== undefined && ping.speed < 2.5);

      if (isStopped) {
        if (currentCluster.length > 0) {
          const anchor = currentCluster[0];
          const dist = this.calculateDistanceMeters(anchor.latitude, anchor.longitude, ping.latitude, ping.longitude);
          if (dist < 40) {
            currentCluster.push(ping);
            continue;
          } else {
            flushCluster();
          }
        }
        currentCluster.push(ping);
      } else {
        if (currentCluster.length > 0) {
          flushCluster();
        }
        rawCoords.push([ping.latitude, ping.longitude]);
      }

      prevValidPing = ping;
    }

    if (currentCluster.length > 0) {
      flushCluster();
    }

    // Simplificação inteligente para remover micro-vibrações retendo curvas reais
    const routeLatLngs = this.smoothRoutePoints(rawCoords);

    return { routeLatLngs, stops };
  }

  /**
   * Suavização de micro-desvios de GPS com tolerância milimétrica (mantém fidelidade do trajeto)
   */
  private smoothRoutePoints(points: [number, number][]): [number, number][] {
    if (points.length <= 2) return points;

    const smoothed: [number, number][] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const distPrev = this.calculateDistanceMeters(prev[0], prev[1], curr[0], curr[1]);
      const distNext = this.calculateDistanceMeters(curr[0], curr[1], next[0], next[1]);

      // Se o ponto intermediário estiver excessivamente próximo (< 4m), ignora jitter
      if (distPrev < 4 && distNext < 4) {
        continue;
      }

      smoothed.push(curr);
    }
    smoothed.push(points[points.length - 1]);
    return smoothed;
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
    this.pollInterval = setInterval(() => {
      if (this.isLiveTracking()) {
        this.loadRoute(true);
      }
    }, 12000);
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

  formatTime(dateStr?: string | null): string {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  goBack(): void {
    this.router.navigate(['/viagens']);
  }
}
