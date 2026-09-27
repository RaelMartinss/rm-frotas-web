import { Component, HostListener, inject, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { IFuelRepository } from '../../domain/repositories/fuel.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import {
  FuelRecord,
  FuelType,
  FuelStats,
  FuelConsumptionReport,
} from '../../domain/models/fuel.model';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Driver } from '../../domain/models/driver.model';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import {
  FuelFormModalComponent,
  FuelFormSubmitPayload
} from './components/fuel-form-modal/fuel-form-modal.component';
import { FuelDetailsModalComponent } from './components/fuel-details-modal/fuel-details-modal.component';
import { FuelDeleteModalComponent } from './components/fuel-delete-modal/fuel-delete-modal.component';
import { FuelEfficiencyReportComponent } from './components/fuel-efficiency-report/fuel-efficiency-report.component';
import {
  LucideCheck,
  LucideDollarSign,
  LucideEye,
  LucideFuel,
  LucideGauge,
  LucideLayers,
  LucideLoader2,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideEdit,
  LucideBarChart3,
  LucideCamera,
  LucideEllipsisVertical,
  LucideRotateCcw,
} from '@lucide/angular';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    FuelFormModalComponent,
    FuelDetailsModalComponent,
    FuelDeleteModalComponent,
    FuelEfficiencyReportComponent,
    LucideFuel,
    LucidePlus,
    LucideLoader2,
    LucideCheck,
    LucideEye,
    LucideDollarSign,
    LucideLayers,
    LucideTrash2,
    LucideGauge,
    LucideSearch,
    LucideEdit,
    LucideBarChart3,
    LucideCamera,
    LucideEllipsisVertical,
    LucideRotateCcw,
  ],
  templateUrl: './fuel-list.html',
  styleUrl: './fuel-list.css',
})
export class FuelListComponent implements OnInit {
  private readonly fuelRepo = inject(IFuelRepository);
  private readonly vehicleRepo = inject(IVehicleRepository);
  private readonly driverRepo = inject(IDriverRepository);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly impersonationService = inject(ImpersonationService);

  // --- SIGNALS DE ESTADO ---
  activeTab = signal<'LIST' | 'REPORT'>('LIST');

  fuelRecords = signal<FuelRecord[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  stats = signal<FuelStats | null>(null);
  consumptionReport = signal<FuelConsumptionReport | null>(null);

  @ViewChild(FuelEfficiencyReportComponent) efficiencyReportComp?: FuelEfficiencyReportComponent;
  activeDropdownRecordId = signal<string | null>(null);

  isLoading = signal(false);
  isStatsLoading = signal(false);
  isReportLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  // Paginação
  totalItems = signal(0);
  page = signal(1);
  limit = signal(10);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.limit()) || 1);
  pageSizeOptions = [10, 20, 50];

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.page() * this.limit(), this.totalItems());
  });

  // Role info
  isDriverUser = computed(() => this.authState.currentUser()?.role === 'DRIVER');
  currentUser = computed(() => this.authState.currentUser());

  // Modais
  selectedRecord = signal<FuelRecord | null>(null);
  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isDetailsModalOpen = signal(false);
  isDeleteModalOpen = signal(false);

  // Filtro
  filterForm = this.fb.group({
    search: [''],
    vehicleId: ['ALL'],
    driverId: ['ALL'],
    fuelType: ['ALL'],
    fullTank: ['ALL'],
  });
  hasActiveFilters = signal<boolean>(false);

  // Tipos de Combustível disponíveis para filtros
  readonly fuelTypes: { value: FuelType; label: string }[] = [
    { value: 'GASOLINA', label: 'Gasolina Comum' },
    { value: 'ETANOL', label: 'Etanol' },
    { value: 'DIESEL', label: 'Diesel Comum' },
    { value: 'DIESEL_S10', label: 'Diesel S-10' },
    { value: 'GNV', label: 'GNV' },
    { value: 'ELETRICO', label: 'Elétrico' },
  ];

  ngOnInit(): void {
    this.loadVehicles();
    this.loadDrivers();

    // Query params da rota
    const qParams = this.route.snapshot.queryParams;
    if (qParams['vehicleId'] || qParams['driverId'] || qParams['fuelType']) {
      this.filterForm.patchValue(
        {
          vehicleId: qParams['vehicleId'] || 'ALL',
          driverId: qParams['driverId'] || 'ALL',
          fuelType: qParams['fuelType'] || 'ALL',
        },
        { emitEvent: false }
      );
    }
    this.checkActiveFilters();

    this.loadRecords();
    this.loadStats();

    // Filtros reativos
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.checkActiveFilters();
        this.page.set(1);
        this.loadRecords();
      });
  }

  checkActiveFilters(): void {
    const v = this.filterForm.value;
    const hasActive =
      !!v.search?.trim() ||
      (!!v.vehicleId && v.vehicleId !== 'ALL') ||
      (!!v.driverId && v.driverId !== 'ALL') ||
      (!!v.fuelType && v.fuelType !== 'ALL') ||
      (!!v.fullTank && v.fullTank !== 'ALL');
    this.hasActiveFilters.set(!!hasActive);
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      vehicleId: 'ALL',
      driverId: 'ALL',
      fuelType: 'ALL',
      fullTank: 'ALL',
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.hasActiveFilters.set(false);
  }

  loadVehicles(): void {
    this.vehicleRepo.getAll({ limit: 100 }).subscribe({
      next: (res) => this.vehicles.set(res.data),
      error: (err) => console.error('Erro ao carregar veículos:', err),
    });
  }

  loadDrivers(): void {
    this.driverRepo.getAll({ limit: 100 }).subscribe({
      next: (res) => this.drivers.set(res.data),
      error: (err) => console.error('Erro ao carregar motoristas:', err),
    });
  }

  loadRecords(): void {
    this.isLoading.set(true);
    const filter = this.filterForm.value;

    this.fuelRepo
      .list({
        search: filter.search || undefined,
        vehicleId: filter.vehicleId !== 'ALL' ? filter.vehicleId! : undefined,
        driverId: filter.driverId !== 'ALL' ? filter.driverId! : undefined,
        fuelType: filter.fuelType !== 'ALL' ? (filter.fuelType as FuelType) : undefined,
        fullTank:
          filter.fullTank === 'TRUE' ? true : filter.fullTank === 'FALSE' ? false : undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          this.fuelRecords.set(res.data);
          this.totalItems.set(res.meta.total);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show('Erro ao carregar abastecimentos.', 'error');
        },
      });
  }

  loadStats(): void {
    this.isStatsLoading.set(true);
    this.fuelRepo.getCostStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.isStatsLoading.set(false);
      },
      error: () => this.isStatsLoading.set(false),
    });
  }

  setTab(tab: 'LIST' | 'REPORT'): void {
    this.activeTab.set(tab);
  }

  toggleDropdown(recordId: string): void {
    this.activeDropdownRecordId.update((curr) => (curr === recordId ? null : recordId));
  }

  closeDropdown(): void {
    this.activeDropdownRecordId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeDropdownRecordId()) {
      this.activeDropdownRecordId.set(null);
    }
  }

  // --- MODAIS E AÇÕES ---
  openCreateModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.errorMessage.set(null);
    this.selectedRecord.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.errorMessage.set(null);
  }

  openEditModal(record: FuelRecord): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedRecord.set(record);
    this.errorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedRecord.set(null);
    this.errorMessage.set(null);
  }

  openDetailsModal(record: FuelRecord): void {
    this.selectedRecord.set(record);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedRecord.set(null);
  }

  openDeleteModal(record: FuelRecord): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedRecord.set(record);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedRecord.set(null);
  }

  handleSaveFuelForm(payload: FuelFormSubmitPayload): void {
    if (this.isEditModalOpen()) {
      this.submitEdit(payload.formValue);
    } else {
      this.submitCreate(payload.formValue);
    }
  }

  submitCreate(val: any): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.fuelRepo
      .create({
        vehicleId: val.vehicleId,
        driverId: val.driverId || undefined,
        fuelType: val.fuelType,
        liters: Number(val.liters),
        pricePerUnit: val.pricePerUnit ? Number(val.pricePerUnit) : undefined,
        totalCost: Number(val.totalCost),
        odometerAtFueling: Number(val.odometerAtFueling),
        gasStation: val.gasStation || undefined,
        fullTank: val.fullTank,
        receiptUrl: val.receiptUrl || undefined,
        fueledAt: val.fueledAt ? new Date(val.fueledAt).toISOString() : undefined,
        notes: val.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeCreateModal();
          this.toastService.show('Abastecimento registrado com sucesso!', 'success');
          this.loadRecords();
          this.loadStats();
          if (this.activeTab() === 'REPORT') {
            this.efficiencyReportComp?.loadEfficiencyReport();
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err.error?.message ||
            'Não foi possível registrar o abastecimento. Verifique os dados.';
          this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
  }

  submitEdit(val: any): void {
    if (!this.selectedRecord()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.fuelRepo
      .update(this.selectedRecord()!.id, {
        fuelType: val.fuelType,
        liters: Number(val.liters),
        pricePerUnit: val.pricePerUnit ? Number(val.pricePerUnit) : undefined,
        totalCost: Number(val.totalCost),
        gasStation: val.gasStation || undefined,
        fullTank: val.fullTank,
        receiptUrl: val.receiptUrl || undefined,
        fueledAt: val.fueledAt ? new Date(val.fueledAt).toISOString() : undefined,
        notes: val.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeEditModal();
          this.toastService.show('Abastecimento atualizado com sucesso!', 'success');
          this.loadRecords();
          this.loadStats();
          if (this.activeTab() === 'REPORT') {
            this.efficiencyReportComp?.loadEfficiencyReport();
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg = err.error?.message || 'Erro ao atualizar abastecimento.';
          this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
  }

  confirmDelete(): void {
    const record = this.selectedRecord();
    if (!record) return;

    this.isSubmitting.set(true);
    this.fuelRepo.delete(record.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        this.toastService.show('Abastecimento excluído com sucesso.', 'success');
        this.loadRecords();
        this.loadStats();
        if (this.activeTab() === 'REPORT') {
          this.efficiencyReportComp?.loadEfficiencyReport();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.error?.message || 'Erro ao excluir abastecimento.';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  // --- PAGINAÇÃO ---
  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.page.set(p);
      this.loadRecords();
    }
  }

  prevPage(): void {
    this.setPage(this.page() - 1);
  }

  nextPage(): void {
    this.setPage(this.page() + 1);
  }

  setPageSize(size: number): void {
    this.limit.set(size);
    this.page.set(1);
    this.loadRecords();
  }

  // Helpers de Formatação e UI
  getFuelTypeLabel(type: FuelType): string {
    const found = this.fuelTypes.find((f) => f.value === type);
    return found ? found.label : type;
  }

  getFuelTypeBadgeClass(type: FuelType): string {
    switch (type) {
      case 'GASOLINA':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ETANOL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DIESEL':
      case 'DIESEL_S10':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'GNV':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'ELETRICO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  openFullReceipt(url: string): void {
    if (!url) return;
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Comprovante de Abastecimento</title>
            <style>
              body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 95vw; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            </style>
          </head>
          <body>
            <img src="${url}" alt="Comprovante de Abastecimento" />
          </body>
        </html>
      `);
      win.document.close();
    }
  }
}
