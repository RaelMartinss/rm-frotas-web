import { Component, HostListener, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { IIncidentRepository } from '../../domain/repositories/incident.repository.interface';
import { LiveAlertsService } from '../../core/services/live-alerts.service';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import { Trip, CreateTripDTO } from '../../domain/models/trip.model';
import { Incident } from '../../domain/models/incident.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Driver } from '../../domain/models/driver.model';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { TripMapModalComponent } from './components/trip-map-modal/trip-map-modal.component';
import { TripFormModalComponent } from './components/trip-form-modal/trip-form-modal.component';
import { TripFinishModalComponent } from './components/trip-finish-modal/trip-finish-modal.component';
import { TripCancelModalComponent } from './components/trip-cancel-modal/trip-cancel-modal.component';
import { TripIncidentPhotoModalComponent } from './components/trip-incident-photo-modal/trip-incident-photo-modal.component';
import {
  FuelFormModalComponent,
  FuelFormSubmitPayload,
} from '../fuel/components/fuel-form-modal/fuel-form-modal.component';
import {
  LucideNavigation,
  LucideLoader2,
  LucideX,
  LucideFuel,
  LucideCheckCircle2,
  LucideMapPin,
  LucideUser,
  LucideShieldAlert,
  LucidePlay,
  LucideBan,
  LucideCheck,
  LucideSearch,
  LucideMap,
  LucideCalendar,
  LucideCamera,
  LucidePhone,
  LucideClock,
  LucideExternalLink,
  LucideTruck,
  LucideAlertTriangle,
  LucideZoomIn,
  LucideRefreshCw,
  LucideEllipsisVertical,
} from '@lucide/angular';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    PaginationComponent,
    TripMapModalComponent,
    TripFormModalComponent,
    TripFinishModalComponent,
    TripCancelModalComponent,
    TripIncidentPhotoModalComponent,
    FuelFormModalComponent,
    LucideNavigation,
    LucideLoader2,
    LucideX,
    LucideFuel,
    LucideMapPin,
    LucideUser,
    LucideShieldAlert,
    LucideCheckCircle2,
    LucidePlay,
    LucideBan,
    LucideCheck,
    LucideSearch,
    LucideMap,
    LucideCalendar,
    LucideCamera,
    LucidePhone,
    LucideClock,
    LucideExternalLink,
    LucideTruck,
    LucideAlertTriangle,
    LucideZoomIn,
    LucideRefreshCw,
    LucideEllipsisVertical,
  ],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.css'
})
export class TripListComponent implements OnInit, OnDestroy {
  private readonly tripRepository = inject(ITripRepository);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly incidentRepository = inject(IIncidentRepository);
  private readonly liveAlertsService = inject(LiveAlertsService);
  private readonly toastService = inject(ToastService);
  protected readonly impersonationService = inject(ImpersonationService);

  trips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  readonly openIncidents = this.liveAlertsService.activeIncidents;
  availableVehicles = signal<Vehicle[]>([]);
  availableDrivers = signal<Driver[]>([]);
  loadingAvailability = signal<boolean>(false);
  loading = signal<boolean>(true);
  private pollInterval: any = null;

  // --- SELETOR DE ABAS PRINCIPAIS ---
  activeMainTab = signal<'trips' | 'history_incidents'>('trips');

  // --- OCORRÊNCIAS SOS & HISTÓRICO DE VIAGEM ---
  allIncidents = signal<Incident[]>([]);
  loadingIncidents = signal<boolean>(false);
  incidentFilterStatus = signal<string>('ALL');
  incidentFilterCategory = signal<string>('ALL');
  selectedPhotoUrl = signal<string | null>(null);
  selectedIncidentForInspection = signal<Incident | null>(null);

  // --- PAGINAÇÃO SERVER-SIDE (OFFSET / LIMIT) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);

  // Busca e Filtros Reativos com Server-Side Query
  searchControl = new FormControl('', { nonNullable: true });
  selectedStatus = signal<string>('ALL');

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // Contadores reativos por status
  statusCounts = signal<{
    all: number;
    inProgress: number;
    planned: number;
    completed: number;
    cancelled: number;
  }>({
    all: 0,
    inProgress: 0,
    planned: 0,
    completed: 0,
    cancelled: 0,
  });

  // Controle de Dropdown de Ações por Linha
  activeDropdownTripId = signal<string | null>(null);

  toggleDropdown(tripId: string): void {
    this.activeDropdownTripId.update((curr) => (curr === tripId ? null : tripId));
  }

  closeDropdown(): void {
    this.activeDropdownTripId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }

  filteredIncidents = computed(() => {
    let list = this.allIncidents();
    const st = this.incidentFilterStatus();
    const cat = this.incidentFilterCategory();
    const search = (this.searchTerm() || '').trim().toLowerCase();

    if (st !== 'ALL') {
      list = list.filter((i) => i.status === st);
    }
    if (cat !== 'ALL') {
      list = list.filter((i) => i.category === cat);
    }
    if (search) {
      list = list.filter((i) =>
        (i.protocol && i.protocol.toLowerCase().includes(search)) ||
        (i.driverName && i.driverName.toLowerCase().includes(search)) ||
        (i.vehiclePlate && i.vehiclePlate.toLowerCase().includes(search)) ||
        (i.vehicleModel && i.vehicleModel.toLowerCase().includes(search)) ||
        (i.description && i.description.toLowerCase().includes(search)) ||
        (i.tripRoute && i.tripRoute.toLowerCase().includes(search))
      );
    }
    return list;
  });

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
    this.loadTrips();
    this.loadStatusCounts();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadTrips();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadTrips();
  }

  setPageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.loadTrips();
  }

  // Estados dos Modais e Requisições
  isTripModalOpen = signal<boolean>(false);
  isSupplyModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  actionLoadingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  selectedTripId = signal<string | null>(null);
  selectedTripForSupply = signal<Trip | null>(null);

  // Modais de Confirmação de Ações
  tripToCancel = signal<Trip | null>(null);
  tripToComplete = signal<Trip | null>(null);
  tripToViewRoute = signal<Trip | null>(null);

  readonly states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadTrips(true);
        this.loadStatusCounts();
      });

    this.loadTrips(true);
    this.loadStatusCounts();
    this.loadIncidents(true);
    this.loadAuxiliaryData();

    // Atualização reativa periódica em segundo plano a cada 12 segundos
    this.pollInterval = setInterval(() => {
      this.loadTrips(false);
      this.loadIncidents(false);
      this.loadStatusCounts();
    }, 12000);
  }

  loadIncidents(showLoading = true): void {
    if (showLoading && this.allIncidents().length === 0) {
      this.loadingIncidents.set(true);
    }
    this.incidentRepository.getAll().subscribe({
      next: (list) => {
        this.allIncidents.set(list);
        this.loadingIncidents.set(false);
      },
      error: () => {
        this.loadingIncidents.set(false);
      },
    });
  }

  setIncidentStatusFilter(status: string): void {
    this.incidentFilterStatus.set(status);
  }

  setIncidentCategoryFilter(cat: string): void {
    this.incidentFilterCategory.set(cat);
  }

  updateIncidentStatus(incident: Incident, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'): void {
    this.incidentRepository.updateStatus(incident.id, newStatus).subscribe({
      next: () => {
        this.toastService.success(`Status da ocorrência ${incident.protocol || ''} atualizado para ${newStatus}.`);
        this.loadIncidents(false);
      },
      error: () => {
        this.toastService.error('Falha ao atualizar status da ocorrência.');
      },
    });
  }

  openPhotoModal(photoUrl: string, incident?: Incident): void {
    this.selectedPhotoUrl.set(photoUrl);
    this.selectedIncidentForInspection.set(incident || null);
  }

  closePhotoModal(): void {
    this.selectedPhotoUrl.set(null);
    this.selectedIncidentForInspection.set(null);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  loadTrips(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.tripRepository
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchControl.value,
        status: this.selectedStatus(),
      })
      .subscribe({
        next: (response) => {
          this.trips.set(response.data || []);
          this.totalItems.set(response.total || 0);
          this.totalPages.set(response.totalPages || 1);
          if (showLoading) {
            this.loading.set(false);
          }
        },
        error: () => {
          if (showLoading) {
            this.loading.set(false);
            this.toastService.error('Erro ao carregar lista de viagens.');
          }
        }
      });
  }

  loadStatusCounts(): void {
    const term = (this.searchControl.value || '').trim();
    this.tripRepository
      .getAll({
        page: 1,
        limit: 100,
        search: term || undefined,
      })
      .subscribe({
        next: (response) => {
          const list = response.data || [];
          const inProgress = list.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'EM_ANDAMENTO').length;
          const planned = list.filter((t) => t.status === 'PLANNED' || t.status === 'PROGRAMADA').length;
          const completed = list.filter((t) => t.status === 'COMPLETED' || t.status === 'CONCLUIDA').length;
          const cancelled = list.filter((t) => t.status === 'CANCELLED' || t.status === 'CANCELADA').length;

          this.statusCounts.set({
            all: response.total ?? list.length,
            inProgress,
            planned,
            completed,
            cancelled,
          });
        },
        error: () => {},
      });
  }

  loadAuxiliaryData(): void {
    this.vehicleRepository.getAll({ limit: 100 }).subscribe({
      next: (response) => this.vehicles.set(response.data || []),
      error: () => {}
    });
    this.driverRepository.getAll({ limit: 100 }).subscribe({
      next: (response) => this.drivers.set(response.data || []),
      error: () => {}
    });
  }

  getSosIncidentForTrip(tripId: string): Incident | undefined {
    return this.openIncidents().find((inc) => inc.tripId === tripId);
  }

  resolveSos(incidentId: string): void {
    if (this.impersonationService.isReadOnly()) return;
    this.liveAlertsService.resolveIncident(incidentId);
  }

  getVehiclePlate(vehicleId: string): string {
    const v = this.vehicles().find((item) => item.id === vehicleId);
    return v ? `${v.plate} (${v.model})` : 'Veículo ' + (vehicleId ? vehicleId.slice(0, 8) : '-');
  }

  getVehicleCurrentKm(vehicleId: string): number {
    const v = this.vehicles().find((item) => item.id === vehicleId);
    return v?.currentKm || 0;
  }

  getDriverName(driverId: string): string {
    const d = this.drivers().find((item) => item.id === driverId);
    return d ? d.name : 'Motorista ' + (driverId ? driverId.slice(0, 8) : '-');
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'Programada';
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'Concluída';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/70';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
        return 'bg-blue-500';
      case 'COMPLETED':
      case 'CONCLUIDA':
        return 'bg-emerald-500';
      case 'PLANNED':
      case 'PROGRAMADA':
        return 'bg-amber-500';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  }

  loadAvailability(excludeTripId?: string): void {
    this.loadingAvailability.set(true);
    this.tripRepository.getAvailability(excludeTripId).subscribe({
      next: (response) => {
        this.availableVehicles.set(response.vehicles || []);
        this.availableDrivers.set(response.drivers || []);
        this.loadingAvailability.set(false);
      },
      error: () => {
        this.loadingAvailability.set(false);
        this.toastService.error('Erro ao carregar veículos e motoristas disponíveis.');
      }
    });
  }

  openTripModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.closeDropdown();
    this.errorMessage.set(null);
    this.loadAvailability();
    this.isTripModalOpen.set(true);
  }

  closeTripModal(): void {
    this.isTripModalOpen.set(false);
    this.errorMessage.set(null);
  }

  openSupplyModal(tripOrId: Trip | string): void {
    if (this.impersonationService.isReadOnly()) return;
    this.closeDropdown();
    const trip = typeof tripOrId === 'string' ? this.trips().find((t) => t.id === tripOrId) : tripOrId;
    const tripId = typeof tripOrId === 'string' ? tripOrId : tripOrId.id;

    this.selectedTripId.set(tripId);
    this.selectedTripForSupply.set(trip || null);
    this.isSupplyModalOpen.set(true);
  }

  closeSupplyModal(): void {
    this.isSupplyModalOpen.set(false);
    this.selectedTripId.set(null);
    this.selectedTripForSupply.set(null);
  }

  // --- AÇÕES DO CICLO DE VIDA DA VIAGEM ---

  startTrip(trip: Trip): void {
    if (this.impersonationService.isReadOnly()) return;
    this.closeDropdown();
    this.actionLoadingId.set(trip.id);
    this.tripRepository.startTrip(trip.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.toastService.success('Viagem iniciada com sucesso! Veículo em trânsito.');
        this.loadTrips();
        this.loadStatusCounts();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        let msg = 'Erro ao iniciar viagem.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }

  openCompleteModal(trip: Trip): void {
    if (this.impersonationService.isReadOnly()) return;
    this.closeDropdown();
    this.tripToComplete.set(trip);
  }

  closeCompleteModal(): void {
    this.tripToComplete.set(null);
  }

  confirmCompleteTrip(): void {
    const trip = this.tripToComplete();
    if (!trip) return;

    this.actionLoadingId.set(trip.id);
    this.tripRepository.completeTrip(trip.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.closeCompleteModal();
        this.toastService.success('Viagem concluída com sucesso! Veículo liberado.');
        this.loadTrips();
        this.loadStatusCounts();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        let msg = 'Erro ao concluir viagem.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }

  openCancelModal(trip: Trip): void {
    if (this.impersonationService.isReadOnly()) return;
    this.closeDropdown();
    this.tripToCancel.set(trip);
  }

  closeCancelModal(): void {
    this.tripToCancel.set(null);
  }

  confirmCancelTrip(): void {
    const trip = this.tripToCancel();
    if (!trip) return;

    this.actionLoadingId.set(trip.id);
    this.tripRepository.cancelTrip(trip.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.closeCancelModal();
        this.toastService.info('Viagem cancelada com sucesso.');
        this.loadTrips();
        this.loadStatusCounts();
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        let msg = 'Erro ao cancelar viagem.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }

  openRouteMap(trip: Trip): void {
    this.closeDropdown();
    this.tripToViewRoute.set(trip);
  }

  closeRouteMap(): void {
    this.tripToViewRoute.set(null);
  }

  saveTrip(payload: CreateTripDTO): void {
    this.errorMessage.set(null);
    this.isSaving.set(true);

    this.tripRepository.create(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Viagem criada com sucesso!');
        this.closeTripModal();
        this.currentPage.set(1);
        this.loadTrips();
        this.loadStatusCounts();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao criar viagem. Verifique os dados informados.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(msg);
        this.toastService.error(`Falha ao criar viagem: ${msg}`);
      }
    });
  }

  saveFuelSupply(payload: FuelFormSubmitPayload): void {
    if (!this.selectedTripId()) return;

    this.isSaving.set(true);
    const formVal = payload.formValue;

    const parseNum = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const parsed = Number(String(val).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    const liters = parseNum(formVal.liters);
    const totalCost = parseNum(formVal.totalCost);
    let pricePerUnit = parseNum(formVal.pricePerUnit);
    if ((!pricePerUnit || pricePerUnit <= 0) && totalCost > 0 && liters > 0) {
      pricePerUnit = Math.round((totalCost / liters) * 1000) / 1000;
    }
    const odometer = parseNum(formVal.odometerAtFueling);
    const fueledAtDate = formVal.fueledAt ? new Date(formVal.fueledAt) : new Date();

    const dto: any = {
      tripId: this.selectedTripId()!,
      liters,
      pricePerUnit: pricePerUnit > 0 ? pricePerUnit : undefined,
      totalValue: totalCost,
      totalCost: totalCost,
      fuelType: formVal.fuelType,
      odometer,
      odometerAtFueling: odometer,
      fullTank: formVal.fullTank !== false,
      gasStation: formVal.gasStation?.trim() || undefined,
      receiptUrl: formVal.receiptUrl || undefined,
      notes: formVal.notes?.trim() || undefined,
      fueledAt: fueledAtDate.toISOString(),
      date: fueledAtDate.toISOString().slice(0, 10),
    };

    this.tripRepository.addFuelSupply(dto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Abastecimento registrado com sucesso!');
        this.closeSupplyModal();
        this.loadTrips();
        this.loadStatusCounts();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao registrar abastecimento.';
        if (err.status === 401) {
          msg = 'Sua sessão expirou ou não possui autorização. Faça login novamente.';
        } else if (err.status === 400 && err.error?.message) {
          const raw = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
          if (raw.includes('odometer') || raw.includes('quilometragem')) {
            msg = 'Quilometragem inválida ou inconsistente com o odômetro do veículo.';
          } else {
            msg = raw;
          }
        } else if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }
}
