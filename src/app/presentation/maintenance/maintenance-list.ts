import { Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IMaintenanceRepository } from '../../domain/repositories/maintenance.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import {
  Maintenance,
  MaintenanceStats,
  MaintenanceStatus,
  MaintenanceType,
} from '../../domain/models/maintenance.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Trip } from '../../domain/models/trip.model';
import { getVehicleBrandLogo } from '../../core/utils/vehicle-brand.util';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import {
  MaintenanceFormModalComponent,
  MaintenanceFormSubmitPayload,
} from './components/maintenance-form-modal/maintenance-form-modal.component';
import { MaintenanceStartModalComponent } from './components/maintenance-start-modal/maintenance-start-modal.component';
import {
  MaintenanceFinishModalComponent,
  MaintenanceFinishSubmitPayload,
} from './components/maintenance-finish-modal/maintenance-finish-modal.component';
import { MaintenanceCancelModalComponent } from './components/maintenance-cancel-modal/maintenance-cancel-modal.component';
import { MaintenanceDetailsModalComponent } from './components/maintenance-details-modal/maintenance-details-modal.component';
import {
  LucideWrench,
  LucidePlus,
  LucideLoader2,
  LucideCheckCircle2,
  LucidePlay,
  LucideBan,
  LucideEye,
  LucideDollarSign,
  LucideLayers,
  LucideEllipsisVertical,
  LucideRotateCcw,
} from '@lucide/angular';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    MaintenanceFormModalComponent,
    MaintenanceStartModalComponent,
    MaintenanceFinishModalComponent,
    MaintenanceCancelModalComponent,
    MaintenanceDetailsModalComponent,
    LucideWrench,
    LucidePlus,
    LucideLoader2,
    LucideCheckCircle2,
    LucidePlay,
    LucideBan,
    LucideEye,
    LucideDollarSign,
    LucideLayers,
    LucideEllipsisVertical,
    LucideRotateCcw,
  ],
  templateUrl: './maintenance-list.html',
})
export class MaintenanceListComponent implements OnInit {
  private readonly maintenanceRepo = inject(IMaintenanceRepository);
  private readonly vehicleRepo = inject(IVehicleRepository);
  private readonly tripRepo = inject(ITripRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly impersonationService = inject(ImpersonationService);
  readonly getBrandLogo = getVehicleBrandLogo;

  // --- SIGNALS DE ESTADO ---
  maintenances = signal<Maintenance[]>([]);
  vehicles = signal<Vehicle[]>([]);
  activeTrips = signal<Trip[]>([]);
  stats = signal<MaintenanceStats | null>(null);

  isLoading = signal(false);
  isStatsLoading = signal(false);
  isActionLoading = signal(false);
  actionError = signal<string | null>(null);

  // Dropdown de Ações por Linha
  activeDropdownMaintenanceId = signal<string | null>(null);

  // Paginação
  totalItems = signal(0);
  page = signal(1);
  limit = signal(10);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.limit()) || 1);
  pageSizeOptions = [10, 20, 50];

  // Modais
  selectedMaintenance = signal<Maintenance | null>(null);
  isCreateModalOpen = signal(false);
  isStartModalOpen = signal(false);
  isFinishModalOpen = signal(false);
  isCancelModalOpen = signal(false);
  isDetailsModalOpen = signal(false);

  // --- FORMULÁRIOS DE FILTRO ---
  filterForm = this.fb.group({
    status: new FormControl<'ALL' | MaintenanceStatus>('ALL'),
    type: new FormControl<'ALL' | MaintenanceType>('ALL'),
    vehicleId: new FormControl<string>(''),
  });

  hasActiveFilters = signal(false);

  // Reativo aos filtros
  statusFilter = toSignal(this.filterForm.get('status')!.valueChanges, {
    initialValue: 'ALL',
  });
  typeFilter = toSignal(this.filterForm.get('type')!.valueChanges, {
    initialValue: 'ALL',
  });
  vehicleFilter = toSignal(this.filterForm.get('vehicleId')!.valueChanges, {
    initialValue: '',
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['vehicleId']) {
      this.filterForm.patchValue({ vehicleId: qp['vehicleId'] }, { emitEvent: false });
    }
    if (qp['status']) {
      this.filterForm.patchValue({ status: qp['status'] }, { emitEvent: false });
    }
    if (qp['type']) {
      this.filterForm.patchValue({ type: qp['type'] }, { emitEvent: false });
    }

    this.checkActiveFilters();
    this.loadVehicles();
    this.loadActiveTrips();
    this.loadStats();
    this.loadMaintenances();

    // Observa mudanças nos filtros
    this.filterForm.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.checkActiveFilters();
        this.page.set(1);
        this.loadMaintenances();
      });
  }

  // --- CONTROLE DE DROPDOWN ---
  toggleDropdown(id: string): void {
    this.activeDropdownMaintenanceId.update((curr) => (curr === id ? null : id));
  }

  closeDropdown(): void {
    this.activeDropdownMaintenanceId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }

  // --- FILTROS ---
  checkActiveFilters(): void {
    const v = this.filterForm.value;
    const hasActive =
      (!!v.status && v.status !== 'ALL') ||
      (!!v.type && v.type !== 'ALL') ||
      !!v.vehicleId;
    this.hasActiveFilters.set(hasActive);
  }

  clearFilters(): void {
    this.filterForm.reset({
      status: 'ALL',
      type: 'ALL',
      vehicleId: '',
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.hasActiveFilters.set(false);
  }

  // --- CARREGAMENTO DE DADOS ---
  loadVehicles(): void {
    this.vehicleRepo.getAll({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicles.set(res.data);
      },
      error: () => {
        this.toastService.error('Erro ao carregar lista de veículos.');
      },
    });
  }

  loadActiveTrips(): void {
    this.tripRepo.getAll({ limit: 100, status: 'IN_PROGRESS' as any }).subscribe({
      next: (res) => {
        this.activeTrips.set(res.data || []);
      },
      error: () => {},
    });
  }

  loadStats(): void {
    this.isStatsLoading.set(true);
    this.maintenanceRepo.getStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.isStatsLoading.set(false);
      },
      error: () => {
        this.isStatsLoading.set(false);
      },
    });
  }

  loadMaintenances(): void {
    this.isLoading.set(true);
    const filter = {
      status: this.statusFilter() === 'ALL' ? undefined : (this.statusFilter() as MaintenanceStatus),
      type: this.typeFilter() === 'ALL' ? undefined : (this.typeFilter() as MaintenanceType),
      vehicleId: this.vehicleFilter() || undefined,
      page: this.page(),
      limit: this.limit(),
    };

    this.maintenanceRepo.getAll(filter).subscribe({
      next: (res) => {
        this.maintenances.set(res.data);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err.error?.message || 'Erro ao carregar manutenções.');
      },
    });
  }

  // --- PAGINAÇÃO ---
  setPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages() && newPage !== this.page()) {
      this.page.set(newPage);
      this.loadMaintenances();
    }
  }

  setPageSize(newLimit: number): void {
    if (newLimit > 0 && newLimit !== this.limit()) {
      this.limit.set(newLimit);
      this.page.set(1);
      this.loadMaintenances();
    }
  }

  // --- MODAIS ---
  openCreateModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.actionError.set(null);
    this.loadActiveTrips();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.actionError.set(null);
  }

  isVehicleInUse(vehicleId?: string | null): boolean {
    if (!vehicleId) return false;
    const hasTrip = this.activeTrips().some(
      (t) => t.vehicleId === vehicleId && (t.status === 'IN_PROGRESS' || t.status === 'EM_ANDAMENTO')
    );
    if (hasTrip) return true;
    const v = this.vehicles().find((veh) => veh.id === vehicleId);
    return v?.status === 'IN_USE' || v?.status === 'EM_VIAGEM';
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const rawMsg = err?.error?.message;
    if (Array.isArray(rawMsg)) {
      return rawMsg.join(', ');
    }
    if (typeof rawMsg === 'string' && rawMsg.trim().length > 0) {
      if (rawMsg.toLowerCase() === 'internal server error') {
        return 'Erro interno no servidor. Tente novamente mais tarde.';
      }
      return rawMsg;
    }
    return fallback;
  }

  submitCreate(payload: MaintenanceFormSubmitPayload): void {
    if (payload.startImmediately && this.isVehicleInUse(payload.vehicleId)) {
      const msg = 'Não é possível iniciar a manutenção imediatamente: este veículo está atualmente em viagem.';
      this.actionError.set(msg);
      this.toastService.warning(msg);
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);

    if (payload.startImmediately) {
      this.maintenanceRepo
        .startDirect({
          vehicleId: payload.vehicleId,
          type: payload.type,
          description: payload.description,
          serviceProvider: payload.serviceProvider,
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success('Manutenção iniciada com sucesso!');
            this.closeCreateModal();
            this.loadStats();
            this.loadMaintenances();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = this.extractErrorMessage(err, 'Erro ao iniciar manutenção.');
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    } else {
      this.maintenanceRepo
        .create({
          vehicleId: payload.vehicleId,
          type: payload.type,
          description: payload.description,
          serviceProvider: payload.serviceProvider,
          scheduledDate: payload.scheduledDate,
        })
        .subscribe({
          next: () => {
            this.isActionLoading.set(false);
            this.toastService.success('Manutenção agendada com sucesso!');
            this.closeCreateModal();
            this.loadStats();
            this.loadMaintenances();
          },
          error: (err) => {
            this.isActionLoading.set(false);
            const msg = this.extractErrorMessage(err, 'Erro ao agendar manutenção.');
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    }
  }

  // Iniciar Manutenção Agendada
  openStartModal(m: Maintenance): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedMaintenance.set(m);
    this.actionError.set(null);
    this.isStartModalOpen.set(true);
  }

  closeStartModal(): void {
    this.isStartModalOpen.set(false);
    this.selectedMaintenance.set(null);
    this.actionError.set(null);
  }

  confirmStart(): void {
    const m = this.selectedMaintenance();
    if (!m) return;

    if (this.isVehicleInUse(m.vehicleId)) {
      const msg = 'Não é possível iniciar a manutenção: este veículo está atualmente em viagem.';
      this.actionError.set(msg);
      this.toastService.warning(msg);
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepo.start(m.id).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Manutenção da placa ${m.vehicle?.plate || ''} iniciada!`);
        this.closeStartModal();
        this.loadStats();
        this.loadMaintenances();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = this.extractErrorMessage(err, 'Erro ao iniciar manutenção.');
        this.actionError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  // Finalizar Manutenção
  openFinishModal(m: Maintenance): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedMaintenance.set(m);
    this.actionError.set(null);
    this.isFinishModalOpen.set(true);
  }

  closeFinishModal(): void {
    this.isFinishModalOpen.set(false);
    this.selectedMaintenance.set(null);
    this.actionError.set(null);
  }

  submitFinish(payload: MaintenanceFinishSubmitPayload): void {
    const m = this.selectedMaintenance();
    if (!m) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepo
      .finish(m.id, {
        odometerAtService: payload.odometerAtService,
        finishedAt: payload.finishedAt,
        items: payload.items,
        cost: payload.cost,
      })
      .subscribe({
        next: () => {
          this.isActionLoading.set(false);
          this.toastService.success(
            `Manutenção finalizada! Veículo ${m.vehicle?.plate || ''} liberado.`
          );
          this.closeFinishModal();
          this.loadStats();
          this.loadMaintenances();
        },
        error: (err) => {
          this.isActionLoading.set(false);
          const msg = this.extractErrorMessage(err, 'Erro ao finalizar manutenção.');
          this.actionError.set(msg);
          this.toastService.error(msg);
        },
      });
  }

  // Cancelar Manutenção
  openCancelModal(m: Maintenance): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedMaintenance.set(m);
    this.actionError.set(null);
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.selectedMaintenance.set(null);
    this.actionError.set(null);
  }

  confirmCancel(reason?: string): void {
    const m = this.selectedMaintenance();
    if (!m) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepo.cancel(m.id, reason).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success('Manutenção cancelada com sucesso.');
        this.closeCancelModal();
        this.loadStats();
        this.loadMaintenances();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = this.extractErrorMessage(err, 'Erro ao cancelar manutenção.');
        this.actionError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  // Ver Detalhes
  openDetailsModal(m: Maintenance): void {
    this.selectedMaintenance.set(m);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedMaintenance.set(null);
  }

  // Helpers de Formatação e Estilos
  getStatusLabel(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'Agendada';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'CONCLUIDA':
        return 'Concluída';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return status;
    }
  }

  getStatusClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'EM_ANDAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'CANCELADA':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getStatusDotClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-500';
      case 'EM_ANDAMENTO':
        return 'bg-amber-500 animate-pulse';
      case 'CONCLUIDA':
        return 'bg-emerald-500';
      case 'CANCELADA':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  }

  getTypeLabel(type: MaintenanceType): string {
    return type === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva';
  }

  getTypeClass(type: MaintenanceType): string {
    return type === 'PREVENTIVA'
      ? 'bg-purple-50 text-purple-700 border-purple-200/60'
      : 'bg-rose-50 text-rose-700 border-rose-200/60';
  }
}
