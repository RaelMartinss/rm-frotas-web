import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IMaintenanceRepository } from '../../domain/repositories/maintenance.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import {
  Maintenance,
  MaintenanceItem,
  MaintenanceStats,
  MaintenanceStatus,
  MaintenanceType,
} from '../../domain/models/maintenance.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideBan,
  LucideCalendar,
  LucideCheck,
  LucideCheckCircle2,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideClock,
  LucideDollarSign,
  LucideEye,
  LucideLayers,
  LucideLoader2,
  LucidePlay,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideTruck,
  LucideWrench,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideWrench,
    LucidePlus,
    LucideLoader2,
    LucideX,
    LucideAlertCircle,
    LucideCheckCircle2,
    LucidePlay,
    LucideBan,
    LucideEye,
    LucideDollarSign,
    LucideLayers,
    LucideTrash2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
  ],
  templateUrl: './maintenance-list.html',
})
export class MaintenanceListComponent implements OnInit {
  private readonly maintenanceRepo = inject(IMaintenanceRepository);
  private readonly vehicleRepo = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  // --- SIGNALS DE ESTADO ---
  maintenances = signal<Maintenance[]>([]);
  vehicles = signal<Vehicle[]>([]);
  stats = signal<MaintenanceStats | null>(null);

  isLoading = signal(false);
  isStatsLoading = signal(false);
  isActionLoading = signal(false);
  actionError = signal<string | null>(null);

  // Paginação
  totalItems = signal(0);
  page = signal(1);
  limit = signal(10);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.limit()) || 1);

  // Modais
  selectedMaintenance = signal<Maintenance | null>(null);
  isCreateModalOpen = signal(false);
  isStartModalOpen = signal(false);
  isFinishModalOpen = signal(false);
  isCancelModalOpen = signal(false);
  isDetailsModalOpen = signal(false);

  // --- FORMULÁRIOS ---
  filterForm = this.fb.group({
    status: new FormControl<'ALL' | MaintenanceStatus>('ALL'),
    type: new FormControl<'ALL' | MaintenanceType>('ALL'),
    vehicleId: new FormControl<string>(''),
  });

  createForm = this.fb.group({
    vehicleId: new FormControl('', [Validators.required]),
    type: new FormControl<MaintenanceType>('PREVENTIVA', [Validators.required]),
    description: new FormControl('', [Validators.required, Validators.minLength(3)]),
    serviceProvider: new FormControl(''),
    scheduledDate: new FormControl(''),
    startImmediately: new FormControl(false),
  });

  finishForm = this.fb.group({
    odometerAtService: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    finishedAt: new FormControl(''),
    items: this.fb.array<FormGroup>([]),
  });

  cancelForm = this.fb.group({
    reason: new FormControl(''),
  });

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
    this.loadVehicles();
    this.loadStats();
    this.loadMaintenances();

    // Observa mudanças nos filtros
    this.filterForm.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
        this.loadMaintenances();
      });
  }

  // --- ITENS DE PEÇAS/SERVIÇOS NA FINALIZAÇÃO ---
  get finishItems(): FormArray {
    return this.finishForm.get('items') as FormArray;
  }

  addFinishItem(): void {
    const itemGroup = this.fb.group({
      name: new FormControl('', [Validators.required]),
      cost: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
      quantity: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    });
    this.finishItems.push(itemGroup);
  }

  removeFinishItem(index: number): void {
    this.finishItems.removeAt(index);
  }

  calculateFinishTotalCost(): number {
    return this.finishItems.controls.reduce((acc, ctrl) => {
      const cost = Number(ctrl.get('cost')?.value) || 0;
      const quantity = Number(ctrl.get('quantity')?.value) || 1;
      return acc + cost * quantity;
    }, 0);
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
  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages() && newPage !== this.page()) {
      this.page.set(newPage);
      this.loadMaintenances();
    }
  }

  onLimitChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newLimit = Number(target.value);
    if (newLimit > 0) {
      this.limit.set(newLimit);
      this.page.set(1);
      this.loadMaintenances();
    }
  }

  // --- MODAIS ---
  openCreateModal(): void {
    this.createForm.reset({
      vehicleId: '',
      type: 'PREVENTIVA',
      description: '',
      serviceProvider: '',
      scheduledDate: '',
      startImmediately: false,
    });
    this.actionError.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.actionError.set(null);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);
    const formVal = this.createForm.value;

    if (formVal.startImmediately) {
      this.maintenanceRepo
        .startDirect({
          vehicleId: formVal.vehicleId!,
          type: formVal.type!,
          description: formVal.description!,
          serviceProvider: formVal.serviceProvider || undefined,
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
            const msg = err.error?.message || 'Erro ao iniciar manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    } else {
      this.maintenanceRepo
        .create({
          vehicleId: formVal.vehicleId!,
          type: formVal.type!,
          description: formVal.description!,
          serviceProvider: formVal.serviceProvider || undefined,
          scheduledDate: formVal.scheduledDate || undefined,
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
            const msg = err.error?.message || 'Erro ao agendar manutenção.';
            this.actionError.set(msg);
            this.toastService.error(msg);
          },
        });
    }
  }

  // Iniciar Manutenção Agendada
  openStartModal(m: Maintenance): void {
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
        const msg = err.error?.message || 'Erro ao iniciar manutenção.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  // Finalizar Manutenção
  openFinishModal(m: Maintenance): void {
    this.selectedMaintenance.set(m);
    this.actionError.set(null);
    this.finishItems.clear();

    // Se a manutenção já tem itens cadastrados, preenche
    if (m.items && m.items.length > 0) {
      for (const item of m.items) {
        this.finishItems.push(
          this.fb.group({
            name: new FormControl(item.name, [Validators.required]),
            cost: new FormControl<number>(item.cost, [Validators.required, Validators.min(0)]),
            quantity: new FormControl<number>(item.quantity || 1, [
              Validators.required,
              Validators.min(1),
            ]),
          })
        );
      }
    } else {
      this.addFinishItem();
    }

    const currentKm = m.vehicle?.currentKm ?? m.odometerAtService ?? 0;
    this.finishForm.patchValue({
      odometerAtService: currentKm,
      finishedAt: new Date().toISOString().substring(0, 10),
    });

    this.isFinishModalOpen.set(true);
  }

  closeFinishModal(): void {
    this.isFinishModalOpen.set(false);
    this.selectedMaintenance.set(null);
    this.actionError.set(null);
  }

  submitFinish(): void {
    if (this.finishForm.invalid) {
      this.finishForm.markAllAsTouched();
      return;
    }

    const m = this.selectedMaintenance();
    if (!m) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    const formVal = this.finishForm.value;
    const items = (formVal.items as any[])
      .filter((i) => i.name && i.name.trim().length > 0)
      .map((i) => ({
        name: i.name,
        cost: Number(i.cost) || 0,
        quantity: Number(i.quantity) || 1,
      }));

    this.maintenanceRepo
      .finish(m.id, {
        odometerAtService: Number(formVal.odometerAtService),
        finishedAt: formVal.finishedAt || undefined,
        items: items.length > 0 ? items : undefined,
        cost: items.length === 0 ? this.calculateFinishTotalCost() : undefined,
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
          const msg = err.error?.message || 'Erro ao finalizar manutenção.';
          this.actionError.set(msg);
          this.toastService.error(msg);
        },
      });
  }

  // Cancelar Manutenção
  openCancelModal(m: Maintenance): void {
    this.selectedMaintenance.set(m);
    this.cancelForm.reset({ reason: '' });
    this.actionError.set(null);
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.selectedMaintenance.set(null);
    this.actionError.set(null);
  }

  confirmCancel(): void {
    const m = this.selectedMaintenance();
    if (!m) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepo.cancel(m.id, this.cancelForm.value.reason || undefined).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success('Manutenção cancelada com sucesso.');
        this.closeCancelModal();
        this.loadStats();
        this.loadMaintenances();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Erro ao cancelar manutenção.';
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

  // --- HELPERS VISUAIS ---
  getStatusClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EM_ANDAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELADA':
        return 'bg-slate-100 text-slate-600 border-slate-200';
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
    }
  }

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
    }
  }

  getTypeClass(type: MaintenanceType): string {
    return type === 'PREVENTIVA'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  }

  getTypeLabel(type: MaintenanceType): string {
    return type === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva';
  }
}
