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
  LucideNavigation,
  LucideLocate,
  LucideShield,
} from '@lucide/angular';

interface KnownCityCoordinate {
  lat: number;
  lng: number;
}

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
    LucideNavigation,
    LucideLocate,
    LucideShield,
  ],
  templateUrl: './trip-create.component.html',
  styleUrl: './trip-create.component.css',
})
export class TripCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tripRepository = inject(ITripRepository);
  private readonly toast = inject(ToastService);

  @ViewChild('mapPreviewContainer', { static: false })
  mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly availableVehicles = signal<Vehicle[]>([]);
  readonly availableDrivers = signal<Driver[]>([]);
  readonly loadingAvailability = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

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

  // Dicionário de cidades comuns da malha para simulação rápida de geocoding no mapa
  private readonly knownCoordinates: Record<string, KnownCityCoordinate> = {
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

    // Reage dinamicamente a mudanças em cidades para atualizar a pré-visualização no mapa
    this.tripForm.valueChanges.subscribe(() => {
      this.updateMapPreview();
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
      originAddress: ['', Validators.required],
      originCity: ['', Validators.required],
      originState: ['PA', Validators.required],
      destinationAddress: ['', Validators.required],
      destinationCity: ['', Validators.required],
      destinationState: ['MA', Validators.required],
      notes: [''],
      waypoints: this.fb.array([]),
    });
  }

  addWaypoint(type: 'FUEL' | 'REST' | 'STOP' = 'STOP'): void {
    const order = this.waypoints.length + 1;
    let defaultTitle = 'Ponto de Coleta / Entrega';
    if (type === 'FUEL') defaultTitle = 'Posto Homologado (Abastecimento)';
    if (type === 'REST') defaultTitle = 'Ponto de Apoio & Descanso (Lei 13.103)';

    const group = this.fb.group({
      type: [type, Validators.required],
      title: [defaultTitle, Validators.required],
      city: ['', Validators.required],
      state: ['PA', Validators.required],
      address: [''],
      notes: [''],
    });

    this.waypoints.push(group);
    this.toast.success('Ponto de parada adicionado ao itinerário.');
    this.updateMapPreview();
  }

  removeWaypoint(index: number): void {
    this.waypoints.removeAt(index);
    this.updateMapPreview();
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

  /**
   * Atualiza as linhas e marcadores no mapa dinamicamente conforme os campos do formulário
   */
  updateMapPreview(): void {
    if (!this.map) return;

    this.clearMarkers();
    const latLngs: [number, number][] = [];

    const originCity = (this.tripForm.get('originCity')?.value || '').trim().toLowerCase();
    const destCity = (this.tripForm.get('destinationCity')?.value || '').trim().toLowerCase();

    // 1. Origem
    const originCoord = this.knownCoordinates[originCity] || { lat: -2.9986, lng: -47.3536 };
    latLngs.push([originCoord.lat, originCoord.lng]);

    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `
        <div class="size-7 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black">
          A
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const originMarker = L.marker([originCoord.lat, originCoord.lng], { icon: startIcon })
      .bindPopup(`<strong>Partida:</strong> ${this.tripForm.get('originCity')?.value || 'Origem'}`)
      .addTo(this.map);
    this.previewMarkers.push(originMarker);

    // 2. Waypoints / Paradas
    const waypointsVal = this.waypoints.value;
    waypointsVal.forEach((w: any, idx: number) => {
      const cityKey = (w.city || '').trim().toLowerCase();
      // Se não souber coordenada exata, faz interpolação visual realista
      const coord = this.knownCoordinates[cityKey] || {
        lat: originCoord.lat + ((idx + 1) * 0.4),
        lng: originCoord.lng + ((idx + 1) * 0.4),
      };
      latLngs.push([coord.lat, coord.lng]);

      const isFuel = w.type === 'FUEL';
      const isRest = w.type === 'REST';
      const badgeBg = isFuel ? 'bg-amber-500' : isRest ? 'bg-blue-500' : 'bg-[#FF6B00]';
      const labelText = isFuel ? '⛽' : isRest ? '☕' : `${idx + 1}`;

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div class="size-7 rounded-full ${badgeBg} border-2 border-[#0F1215] shadow-xl flex items-center justify-center text-white text-xs font-bold">
            ${labelText}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const m = L.marker([coord.lat, coord.lng], { icon: stopIcon })
        .bindPopup(`<strong>${w.title || 'Parada'}</strong><br/>${w.city || ''}`)
        .addTo(this.map!);
      this.previewMarkers.push(m);
    });

    // 3. Destino
    const destCoord = this.knownCoordinates[destCity] || { lat: -2.5307, lng: -44.3068 };
    latLngs.push([destCoord.lat, destCoord.lng]);

    const destIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div class="size-7 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black">
          B
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const destMarker = L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
      .bindPopup(`<strong>Destino:</strong> ${this.tripForm.get('destinationCity')?.value || 'Destino'}`)
      .addTo(this.map);
    this.previewMarkers.push(destMarker);

    // 4. Polylines
    if (this.previewPolylineGlow) {
      this.previewPolylineGlow.setLatLngs(latLngs);
    } else {
      this.previewPolylineGlow = L.polyline(latLngs, {
        color: '#10B981',
        weight: 8,
        opacity: 0.25,
        className: 'preview-route-glow',
      }).addTo(this.map);
    }

    if (this.previewPolylineCore) {
      this.previewPolylineCore.setLatLngs(latLngs);
    } else {
      this.previewPolylineCore = L.polyline(latLngs, {
        color: '#34D399',
        weight: 4,
        opacity: 0.9,
        className: 'preview-route-core',
      }).addTo(this.map);
    }

    if (latLngs.length > 1) {
      this.map.fitBounds(this.previewPolylineCore.getBounds(), { padding: [40, 40] });
    }
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
      next: (created) => {
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
