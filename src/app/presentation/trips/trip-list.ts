import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { IIncidentRepository } from '../../domain/repositories/incident.repository.interface';
import { LiveAlertsService } from '../../core/services/live-alerts.service';
import { ToastService } from '../../core/services/toast.service';
import { Trip, FuelSupply } from '../../domain/models/trip.model';
import { Incident } from '../../domain/models/incident.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Driver } from '../../domain/models/driver.model';
import { TripMapModalComponent } from './components/trip-map-modal/trip-map-modal.component';
import {
  LucideNavigation,
  LucideLoader2,
  LucideX,
  LucideFuel,
  LucideCheckCircle2,
  LucideMapPin,
  LucideUser,
  LucideAlertCircle,
  LucideShieldAlert,
  LucidePlay,
  LucideBan,
  LucideCheck,
  LucideSearch,
  LucideMap,
  LucideCalendar,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight
} from '@lucide/angular';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TripMapModalComponent,
    LucideNavigation,
    LucideLoader2,
    LucideX,
    LucideFuel,
    LucideMapPin,
    LucideUser,
    LucideAlertCircle,
    LucideShieldAlert,
    LucideCheckCircle2,
    LucidePlay,
    LucideBan,
    LucideCheck,
    LucideSearch,
    LucideMap,
    LucideCalendar,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight
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
  private readonly fb = inject(FormBuilder);

  trips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  readonly openIncidents = this.liveAlertsService.activeIncidents;
  availableVehicles = signal<Vehicle[]>([]);
  availableDrivers = signal<Driver[]>([]);
  loadingAvailability = signal<boolean>(false);
  loading = signal<boolean>(true);
  private pollInterval: any = null;

  // --- PAGINAÇÃO SERVER-SIDE (OFFSET / LIMIT) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10); // Inicializa com 10 registros
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  pageSizeOptions: number[] = [10, 25, 50];

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

  // Computed ranges para exibição na barra de paginação
  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  // Gera lista de páginas com elipses (ex: [1, 2, 3, '...', 10])
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 1;
    const range: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < total - 1) range.push('...');
    range.push(total);

    return range;
  });

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
    this.loadTrips();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadTrips();
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadTrips();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.setPage(this.currentPage() - 1);
    }
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

  // Modais de Confirmação de Ações
  tripToCancel = signal<Trip | null>(null);
  tripToComplete = signal<Trip | null>(null);
  tripToViewRoute = signal<Trip | null>(null);

  readonly states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  private getDefaultScheduledDate(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  // Formulário de Cadastro de Viagem alinhado ao backend
  tripForm: FormGroup = this.fb.group({
    vehicleId: ['', [Validators.required]],
    driverId: ['', [Validators.required]],
    scheduledDate: [this.getDefaultScheduledDate(), [Validators.required]],
    originAddress: ['', [Validators.required, Validators.minLength(3)]],
    originCity: ['', [Validators.required]],
    originState: ['PA', [Validators.required, Validators.maxLength(2)]],
    destinationAddress: ['', [Validators.required, Validators.minLength(3)]],
    destinationCity: ['', [Validators.required]],
    destinationState: ['PA', [Validators.required, Validators.maxLength(2)]],
  });

  supplyForm: FormGroup = this.fb.group({
    liters: [0, [Validators.required, Validators.min(1)]],
    totalValue: [0, [Validators.required, Validators.min(1)]],
    fuelType: ['DIESEL', [Validators.required]],
    odometer: [0, [Validators.required, Validators.min(0)]],
    date: [new Date().toISOString().substring(0, 10), [Validators.required]]
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadTrips(true);
      });

    this.loadTrips(true);
    this.loadAuxiliaryData();

    // Atualização reativa periódica em segundo plano a cada 8 segundos
    this.pollInterval = setInterval(() => {
      this.loadTrips(false);
      this.liveAlertsService.checkIncidents();
    }, 8000);
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
    this.liveAlertsService.resolveIncident(incidentId);
  }

  getVehiclePlate(vehicleId: string): string {
    const v = this.vehicles().find((item) => item.id === vehicleId);
    return v ? `${v.plate} (${v.model})` : 'Veículo ' + (vehicleId ? vehicleId.slice(0, 8) : '-');
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

  openTripModal(trip?: Trip): void {
    this.errorMessage.set(null);
    this.loadAvailability(trip?.id);
    this.tripForm.reset({
      originState: 'PA',
      destinationState: 'PA',
      vehicleId: '',
      driverId: '',
      scheduledDate: this.getDefaultScheduledDate(),
      originAddress: '',
      originCity: '',
      destinationAddress: '',
      destinationCity: ''
    });
    this.isTripModalOpen.set(true);
  }

  closeTripModal(): void {
    this.isTripModalOpen.set(false);
    this.errorMessage.set(null);
  }

  openSupplyModal(tripId: string): void {
    this.selectedTripId.set(tripId);
    this.supplyForm.reset({
      fuelType: 'DIESEL',
      date: new Date().toISOString().substring(0, 10),
      liters: 0,
      totalValue: 0,
      odometer: 0
    });
    this.isSupplyModalOpen.set(true);
  }

  closeSupplyModal(): void {
    this.isSupplyModalOpen.set(false);
    this.selectedTripId.set(null);
  }

  // --- AÇÕES DO CICLO DE VIDA DA VIAGEM ---

  startTrip(trip: Trip): void {
    this.actionLoadingId.set(trip.id);
    this.tripRepository.startTrip(trip.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.toastService.success('Viagem iniciada com sucesso! Veículo em trânsito.');
        this.loadTrips();
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
    this.tripToViewRoute.set(trip);
  }

  closeRouteMap(): void {
    this.tripToViewRoute.set(null);
  }

  saveTrip(): void {
    this.errorMessage.set(null);

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.tripForm.value;

    const payload: any = {
      driverId: formValue.driverId,
      vehicleId: formValue.vehicleId,
      origin: {
        address: formValue.originAddress?.trim(),
        city: formValue.originCity?.trim(),
        state: formValue.originState?.trim().toUpperCase(),
      },
      destination: {
        address: formValue.destinationAddress?.trim(),
        city: formValue.destinationCity?.trim(),
        state: formValue.destinationState?.trim().toUpperCase(),
      }
    };

    if (formValue.scheduledDate) {
      payload.scheduledDate = new Date(formValue.scheduledDate).toISOString();
    }

    this.tripRepository.create(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Viagem criada com sucesso!');
        this.closeTripModal();
        this.currentPage.set(1);
        this.loadTrips();
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

  saveFuelSupply(): void {
    if (this.supplyForm.invalid || !this.selectedTripId()) {
      this.supplyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const dto = {
      ...this.supplyForm.value,
      tripId: this.selectedTripId()!
    };

    this.tripRepository.addFuelSupply(dto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Abastecimento registrado com sucesso!');
        this.closeSupplyModal();
        this.loadTrips();
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao registrar abastecimento.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      }
    });
  }
}
