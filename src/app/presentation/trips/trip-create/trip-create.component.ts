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
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ITripRepository } from '../../../domain/repositories/trip.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import { RoutingService, RouteGeometryResult } from '../../../core/services/routing.service';
import { Vehicle } from '../../../domain/models/vehicle.model';
import { Driver } from '../../../domain/models/driver.model';
import { CreateTripDTO, TripWaypoint } from '../../../domain/models/trip.model';
import {
  LucideArrowLeft,
  LucideTruck,
  LucideUser,
  LucideCalendar,
  LucideTrash2,
  LucideFuel,
  LucideCoffee,
  LucidePackage,
  LucideAlertCircle,
  LucideLoader2,
  LucideCheck,
  LucideShield,
  LucideMapPin,
  LucideLocate,
  LucidePlus,
  LucideMousePointer,
  LucideClock,
  LucideMaximize2,
  LucideMinimize2,
  LucideRoute,
} from '@lucide/angular';

interface PointCoordinate {
  lat: number;
  lng: number;
}

export type SelectionTarget = 'origin' | 'destination' | 'waypoint';

@Component({
  selector: 'app-trip-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideArrowLeft,
    LucideTruck,
    LucideUser,
    LucideCalendar,
    LucideTrash2,
    LucideFuel,
    LucideCoffee,
    LucidePackage,
    LucideAlertCircle,
    LucideLoader2,
    LucideCheck,
    LucideShield,
    LucideMapPin,
    LucideLocate,
    LucidePlus,
    LucideMousePointer,
    LucideClock,
    LucideMaximize2,
    LucideMinimize2,
    LucideRoute,
  ],
  templateUrl: './trip-create.component.html',
  styleUrl: './trip-create.component.css',
})
export class TripCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tripRepository = inject(ITripRepository);
  private readonly toast = inject(ToastService);
  private readonly routingService = inject(RoutingService);

  @ViewChild('mapPreviewContainer', { static: false })
  mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly availableVehicles = signal<Vehicle[]>([]);
  readonly availableDrivers = signal<Driver[]>([]);
  readonly loadingAvailability = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Status do cálculo de traçado real
  readonly calculatingRoute = signal<boolean>(false);
  readonly routeStats = signal<{ distanceKm: number; duration: string } | null>(null);
  readonly isExpandedMap = signal<boolean>(false);

  // Modo interativo de clique no mapa estilo Google Maps
  readonly isMapPickerActive = signal<boolean>(false);
  readonly activePickTarget = signal<SelectionTarget>('destination');
  readonly activeWaypointIndex = signal<number | null>(null);

  readonly states = signal<string[]>([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ]);

  tripForm!: FormGroup;

  private map: L.Map | null = null;
  private previewPolylineGlow: L.Polyline | null = null;
  private previewPolylineCore: L.Polyline | null = null;
  private previewMarkers: L.Marker[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private routeDebounceTimer: any = null;

  // Dicionário de cidades comuns da malha para geolocalização rápida inicial
  private readonly knownCoordinates: Record<string, PointCoordinate> = {
    'paragominas': { lat: -2.9986, lng: -47.3536 },
    'belem': { lat: -1.4558, lng: -48.4902 },
    'sao luis': { lat: -2.5307, lng: -44.3068 },
    'imperatriz': { lat: -5.5266, lng: -47.4776 },
    'maraba': { lat: -5.3686, lng: -49.1174 },
    'castanhal': { lat: -1.2968, lng: -47.9254 },
    'tucurui': { lat: -3.7661, lng: -49.6725 },
    'parauapebas': { lat: -6.0683, lng: -49.9022 },
    'acailandia': { lat: -4.9458, lng: -47.4989 },
    'santa ines': { lat: -3.6667, lng: -45.3800 },
    'teresina': { lat: -5.0920, lng: -42.8038 },
    'fortaleza': { lat: -3.7172, lng: -38.5433 },
    'recife': { lat: -8.0476, lng: -34.8770 },
    'salvador': { lat: -12.9777, lng: -38.5016 },
    'brasilia': { lat: -15.7975, lng: -47.8919 },
    'goiania': { lat: -16.6869, lng: -49.2648 },
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
    'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
    'curitiba': { lat: -25.4284, lng: -49.2733 },
    'porto alegre': { lat: -30.0346, lng: -51.2177 },
  };

  ngOnInit(): void {
    this.initForm();
    this.loadAvailability();

    // Reage dinamicamente a mudanças em cidades e pontos para recalcular a rota real
    this.tripForm.valueChanges.subscribe(() => {
      this.debouncedUpdateMapPreview();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.setupResizeObserver();
      this.updateMapPreview();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.routeDebounceTimer) {
      clearTimeout(this.routeDebounceTimer);
    }
    this.clearMarkers();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  get waypoints(): FormArray {
    return this.tripForm.get('waypoints') as FormArray;
  }

  private initForm(): void {
    const now = new Date();
    const scheduledDefault = new Date(now.getTime() + 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    this.tripForm = this.fb.group({
      vehicleId: ['', Validators.required],
      driverId: ['', Validators.required],
      scheduledDate: [scheduledDefault, Validators.required],
      estimatedArrivalDate: [''],
      // Ponto de Partida
      originAddress: ['Pátio Central - Rodovia PA-125, Km 02', Validators.required],
      originCity: ['Paragominas', Validators.required],
      originState: ['PA', Validators.required],
      originLat: [-2.9986],
      originLng: [-47.3536],
      // Ponto de Chegada
      destinationAddress: ['Terminal de Cargas - Itaqui', Validators.required],
      destinationCity: ['São Luís', Validators.required],
      destinationState: ['MA', Validators.required],
      destinationLat: [-2.5307],
      destinationLng: [-44.3068],
      notes: [''],
      waypoints: this.fb.array([]),
    });
  }

  addWaypoint(type: 'FUEL' | 'REST' | 'STOP' = 'STOP', defaultValues?: Partial<{
    title: string;
    city: string;
    state: string;
    address: string;
    lat: number;
    lng: number;
  }>): void {
    const order = this.waypoints.length + 1;
    let defaultTitle = 'Ponto de Coleta / Entrega';
    if (type === 'FUEL') defaultTitle = 'Posto Homologado (Abastecimento)';
    if (type === 'REST') defaultTitle = 'Ponto de Apoio & Descanso (Lei 13.103)';

    const group = this.fb.group({
      type: [type, Validators.required],
      title: [defaultValues?.title || defaultTitle, Validators.required],
      city: [defaultValues?.city || 'Açailândia', Validators.required],
      state: [defaultValues?.state || 'MA', Validators.required],
      address: [defaultValues?.address || 'BR-010'],
      notes: [''],
      lat: [defaultValues?.lat || -4.9458],
      lng: [defaultValues?.lng || -47.4989],
    });

    this.waypoints.push(group);
    this.toast.success('Ponto adicionado ao itinerário.');
    this.debouncedUpdateMapPreview();
  }

  removeWaypoint(index: number): void {
    this.waypoints.removeAt(index);
    this.debouncedUpdateMapPreview();
  }

  /**
   * Ativa o modo de seleção interativa de pontos clicando diretamente no mapa
   */
  startPickingOnMap(target: SelectionTarget, waypointIndex: number | null = null): void {
    this.isMapPickerActive.set(true);
    this.activePickTarget.set(target);
    this.activeWaypointIndex.set(waypointIndex);

    const targetDesc =
      target === 'origin'
        ? 'Ponto de Origem'
        : target === 'destination'
        ? 'Destino Final'
        : `Parada ${Number(waypointIndex) + 1}`;

    this.toast.info(`Clique no mapa para posicionar: ${targetDesc}`);
  }

  stopPickingOnMap(): void {
    this.isMapPickerActive.set(false);
    this.activeWaypointIndex.set(null);
  }

  loadAvailability(): void {
    this.loadingAvailability.set(true);
    this.tripRepository.getAvailability().subscribe({
      next: (resp) => {
        this.availableVehicles.set(resp.vehicles || []);
        this.availableDrivers.set(resp.drivers || []);
        this.loadingAvailability.set(false);
      },
      error: () => {
        this.loadingAvailability.set(false);
        this.errorMessage.set('Erro ao carregar veículos e motoristas disponíveis.');
      },
    });
  }

  private initMap(): void {
    if (!this.mapContainerRef || this.map) return;

    this.map = L.map(this.mapContainerRef.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView([-2.9986, -47.3536], 7);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(this.map);

    // Evento de clique interativo no mapa Leaflet (estilo Google Maps)
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.handleMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  private handleMapClick(lat: number, lng: number): void {
    // Se o modo picker está ativo, aplica diretamente ao campo selecionado
    if (this.isMapPickerActive()) {
      this.applyCoordinateToTarget(lat, lng, this.activePickTarget(), this.activeWaypointIndex());
      this.stopPickingOnMap();
      return;
    }

    // Se clicou no mapa sem estar no modo ativo, abre um mini popup de opções estilo Google Maps
    const popupContent = document.createElement('div');
    popupContent.className = 'text-xs text-[#0F1215] space-y-2 p-1 font-sans';
    popupContent.innerHTML = `
      <div class="font-bold border-b border-gray-200 pb-1 text-gray-800">
        Local selecionado (${lat.toFixed(4)}, ${lng.toFixed(4)})
      </div>
      <div class="flex flex-col gap-1.5 pt-1">
        <button id="btn-set-origin" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer border border-emerald-300">
          📍 Definir como Partida (Origem)
        </button>
        <button id="btn-add-dest" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 font-semibold cursor-pointer border border-orange-300">
          ➕ Adicionar como Parada no Itinerário
        </button>
        <button id="btn-set-dest" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold cursor-pointer border border-rose-300">
          🏁 Definir como Destino Final
        </button>
      </div>
    `;

    const popup = L.popup()
      .setLatLng([lat, lng])
      .setContent(popupContent)
      .openOn(this.map!);

    setTimeout(() => {
      const btnOrigin = popupContent.querySelector('#btn-set-origin');
      const btnAddDest = popupContent.querySelector('#btn-add-dest');
      const btnDest = popupContent.querySelector('#btn-set-dest');

      btnOrigin?.addEventListener('click', () => {
        this.applyCoordinateToTarget(lat, lng, 'origin');
        this.map?.closePopup();
      });

      btnAddDest?.addEventListener('click', () => {
        this.reverseGeocodeAndAddStop(lat, lng);
        this.map?.closePopup();
      });

      btnDest?.addEventListener('click', () => {
        this.applyCoordinateToTarget(lat, lng, 'destination');
        this.map?.closePopup();
      });
    }, 50);
  }

  private applyCoordinateToTarget(
    lat: number,
    lng: number,
    target: SelectionTarget,
    waypointIndex: number | null = null
  ): void {
    this.toast.info('Identificando localidade...');

    this.routingService.reverseGeocode(lat, lng).subscribe({
      next: (geo) => {
        const city = geo?.city || 'Local no Mapa';
        const state = geo?.state || 'PA';
        const road = geo?.road ? `${geo.road}` : `Coord. ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        if (target === 'origin') {
          this.tripForm.patchValue({
            originCity: city,
            originState: state,
            originAddress: road,
            originLat: lat,
            originLng: lng,
          });
          this.toast.success(`Origem definida: ${city} - ${state}`);
        } else if (target === 'destination') {
          this.tripForm.patchValue({
            destinationCity: city,
            destinationState: state,
            destinationAddress: road,
            destinationLat: lat,
            destinationLng: lng,
          });
          this.toast.success(`Destino definido: ${city} - ${state}`);
        } else if (target === 'waypoint' && waypointIndex !== null) {
          const wpGroup = this.waypoints.at(waypointIndex) as FormGroup;
          if (wpGroup) {
            wpGroup.patchValue({
              city,
              state,
              address: road,
              lat,
              lng,
            });
            this.toast.success(`Parada ${waypointIndex + 1} atualizada.`);
          }
        }

        this.debouncedUpdateMapPreview();
      },
      error: () => {
        this.toast.warning('Não foi possível obter endereço detalhado, usando coordenadas.');
        if (target === 'origin') {
          this.tripForm.patchValue({ originLat: lat, originLng: lng });
        } else if (target === 'destination') {
          this.tripForm.patchValue({ destinationLat: lat, destinationLng: lng });
        }
        this.debouncedUpdateMapPreview();
      },
    });
  }

  private reverseGeocodeAndAddStop(lat: number, lng: number): void {
    this.routingService.reverseGeocode(lat, lng).subscribe({
      next: (geo) => {
        this.addWaypoint('STOP', {
          title: geo?.displayName?.split(',')[0] || 'Parada Intermediária',
          city: geo?.city || 'Localidade',
          state: geo?.state || 'PA',
          address: geo?.road || `Coord. ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        });
      },
      error: () => {
        this.addWaypoint('STOP', {
          title: 'Parada no Mapa',
          city: 'Localidade',
          state: 'PA',
          address: `Coord. ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        });
      },
    });
  }

  private setupResizeObserver(): void {
    if (!this.mapContainerRef?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.resizeObserver.observe(this.mapContainerRef.nativeElement);
  }

  private clearMarkers(): void {
    for (const m of this.previewMarkers) {
      m.remove();
    }
    this.previewMarkers = [];
  }

  private debouncedUpdateMapPreview(): void {
    if (this.routeDebounceTimer) {
      clearTimeout(this.routeDebounceTimer);
    }
    this.routeDebounceTimer = setTimeout(() => {
      this.updateMapPreview();
    }, 350);
  }

  /**
   * Resolve as coordenadas dos pontos da rota (origem, waypoints, destino)
   */
  private resolveOrderedPoints(): { coords: [number, number]; label: string; type: string }[] {
    const points: { coords: [number, number]; label: string; type: string }[] = [];

    const originCity = (this.tripForm.get('originCity')?.value || '').trim().toLowerCase();
    const originLat = this.tripForm.get('originLat')?.value;
    const originLng = this.tripForm.get('originLng')?.value;

    let originCoord: PointCoordinate;
    if (originLat && originLng) {
      originCoord = { lat: originLat, lng: originLng };
    } else {
      originCoord = this.knownCoordinates[originCity] || { lat: -2.9986, lng: -47.3536 };
    }
    points.push({
      coords: [originCoord.lat, originCoord.lng],
      label: this.tripForm.get('originCity')?.value || 'Origem',
      type: 'origin',
    });

    // Waypoints intermediários
    const waypointsVal = this.waypoints.value;
    waypointsVal.forEach((w: any, idx: number) => {
      let coord: PointCoordinate;
      if (w.lat && w.lng) {
        coord = { lat: w.lat, lng: w.lng };
      } else {
        const cityKey = (w.city || '').trim().toLowerCase();
        coord = this.knownCoordinates[cityKey] || {
          lat: originCoord.lat + (idx + 1) * 0.4,
          lng: originCoord.lng + (idx + 1) * 0.4,
        };
      }

      points.push({
        coords: [coord.lat, coord.lng],
        label: w.title || `Parada ${idx + 1}`,
        type: w.type || 'STOP',
      });
    });

    // Destino final
    const destCity = (this.tripForm.get('destinationCity')?.value || '').trim().toLowerCase();
    const destLat = this.tripForm.get('destinationLat')?.value;
    const destLng = this.tripForm.get('destinationLng')?.value;

    let destCoord: PointCoordinate;
    if (destLat && destLng) {
      destCoord = { lat: destLat, lng: destLng };
    } else {
      destCoord = this.knownCoordinates[destCity] || { lat: -2.5307, lng: -44.3068 };
    }
    points.push({
      coords: [destCoord.lat, destCoord.lng],
      label: this.tripForm.get('destinationCity')?.value || 'Destino Final',
      type: 'destination',
    });

    return points;
  }

  /**
   * Atualiza as linhas e marcadores no mapa Leaflet com Traçado Real de Rodovia (OSRM Driving Engine)
   */
  updateMapPreview(): void {
    if (!this.map) return;

    this.clearMarkers();
    const orderedPoints = this.resolveOrderedPoints();
    const stopLatLngs = orderedPoints.map((p) => p.coords);

    // 1. Plotar Marcadores Estilizados no Mapa
    orderedPoints.forEach((p, idx) => {
      let markerIcon: L.DivIcon;

      if (p.type === 'origin') {
        markerIcon = L.divIcon({
          className: 'custom-start-marker',
          html: `
            <div class="size-8 rounded-full bg-emerald-500 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-black animate-pulse">
              A
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      } else if (p.type === 'destination') {
        markerIcon = L.divIcon({
          className: 'custom-dest-marker',
          html: `
            <div class="size-8 rounded-full bg-rose-500 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-black">
              B
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      } else {
        const isFuel = p.type === 'FUEL';
        const isRest = p.type === 'REST';
        const bgClass = isFuel ? 'bg-amber-500' : isRest ? 'bg-blue-500' : 'bg-[#FF6B00]';
        const symbol = isFuel ? '⛽' : isRest ? '☕' : `${idx}`;

        markerIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div class="size-7 rounded-full ${bgClass} border-2 border-[#0F1215] shadow-xl flex items-center justify-center text-white text-[11px] font-black">
              ${symbol}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
      }

      const m = L.marker(p.coords, { icon: markerIcon })
        .bindPopup(`<strong>${p.label}</strong><br/><span class="text-xs text-gray-400">Ponto ${idx + 1}</span>`)
        .addTo(this.map!);
      this.previewMarkers.push(m);
    });

    // 2. Traçar a Rota Real nas Rodovias via OSRM Driving Engine
    this.calculatingRoute.set(true);
    this.routingService.calculateRoute(stopLatLngs).subscribe({
      next: (result) => {
        this.calculatingRoute.set(false);
        if (result && result.coordinates.length > 0) {
          this.routeStats.set({
            distanceKm: result.distanceKm,
            duration: result.durationFormatted,
          });
          this.renderPolylines(result.coordinates);
        } else {
          // Fallback para linha direta se offline ou fora de alcance
          this.routeStats.set(null);
          this.renderPolylines(stopLatLngs);
        }
      },
      error: () => {
        this.calculatingRoute.set(false);
        this.renderPolylines(stopLatLngs);
      },
    });
  }

  private renderPolylines(latLngs: [number, number][]): void {
    if (!this.map) return;

    // Linha Neon Glow (efeito visual Google Maps / Industrial Dark)
    if (this.previewPolylineGlow) {
      this.previewPolylineGlow.setLatLngs(latLngs);
    } else {
      this.previewPolylineGlow = L.polyline(latLngs, {
        color: '#10B981',
        weight: 9,
        opacity: 0.28,
        className: 'preview-route-glow',
      }).addTo(this.map);
    }

    // Linha Central do Traçado
    if (this.previewPolylineCore) {
      this.previewPolylineCore.setLatLngs(latLngs);
    } else {
      this.previewPolylineCore = L.polyline(latLngs, {
        color: '#34D399',
        weight: 4.5,
        opacity: 0.95,
        className: 'preview-route-core',
      }).addTo(this.map);
    }

    if (latLngs.length > 1) {
      this.map.fitBounds(this.previewPolylineCore.getBounds(), { padding: [45, 45] });
    }
  }

  centerMapOnRoute(): void {
    if (!this.map) return;
    if (this.previewPolylineCore && this.previewPolylineCore.getLatLngs().length > 0) {
      this.map.fitBounds(this.previewPolylineCore.getBounds(), { padding: [50, 50], maxZoom: 16 });
    } else {
      const ordered = this.resolveOrderedPoints();
      if (ordered.length > 0) {
        const bounds = L.latLngBounds(ordered.map((o) => o.coords));
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }

  toggleExpandMap(): void {
    this.isExpandedMap.update((val) => !val);
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        this.centerMapOnRoute();
      }
    }, 200);
  }

  onSubmit(): void {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.toast.error('Preencha os campos obrigatórios do formulário.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const fv = this.tripForm.value;

    const formattedWaypoints: TripWaypoint[] = (fv.waypoints || []).map((w: any, index: number) => ({
      order: index + 1,
      type: w.type,
      title: w.title,
      city: w.city,
      state: w.state,
      address: w.address || null,
      notes: w.notes || null,
    }));

    const payload: CreateTripDTO = {
      vehicleId: fv.vehicleId,
      driverId: fv.driverId,
      scheduledDate: fv.scheduledDate ? new Date(fv.scheduledDate).toISOString() : undefined,
      estimatedArrivalDate: fv.estimatedArrivalDate ? new Date(fv.estimatedArrivalDate).toISOString() : undefined,
      origin: {
        address: fv.originAddress,
        city: fv.originCity,
        state: fv.originState,
      },
      destination: {
        address: fv.destinationAddress,
        city: fv.destinationCity,
        state: fv.destinationState,
      },
      notes: fv.notes || undefined,
      waypoints: formattedWaypoints.length > 0 ? formattedWaypoints : undefined,
    };

    this.tripRepository.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Viagem e itinerário lançados com sucesso!');
        this.router.navigate(['/viagens']);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.message || 'Erro ao lançar nova viagem. Verifique os dados.';
        this.errorMessage.set(msg);
        this.toast.error(msg);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/viagens']);
  }
}
