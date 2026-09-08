import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IFuelRepository } from '../../domain/repositories/fuel.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ToastService } from '../../core/services/toast.service';
import {
  FuelRecord,
  FuelType,
  FuelStats,
  FuelConsumptionReport,
} from '../../domain/models/fuel.model';
import { compressImage } from '../../core/utils/image-compressor';
import { Vehicle } from '../../domain/models/vehicle.model';
import { Driver } from '../../domain/models/driver.model';
import {
  LucideAlertCircle,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideDollarSign,
  LucideEye,
  LucideFuel,
  LucideGauge,
  LucideLayers,
  LucideLoader2,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideTruck,
  LucideX,
  LucideEdit,
  LucideBarChart3,
  LucideInfo,
  LucideCamera,
  LucideExternalLink,
} from '@lucide/angular';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideFuel,
    LucidePlus,
    LucideLoader2,
    LucideX,
    LucideAlertCircle,
    LucideCheck,
    LucideEye,
    LucideDollarSign,
    LucideLayers,
    LucideTrash2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideTruck,
    LucideGauge,
    LucideSearch,
    LucideEdit,
    LucideBarChart3,
    LucideInfo,
    LucideCamera,
    LucideExternalLink,
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
  private readonly fb = inject(FormBuilder);

  // --- SIGNALS DE ESTADO ---
  activeTab = signal<'LIST' | 'REPORT'>('LIST');

  fuelRecords = signal<FuelRecord[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  stats = signal<FuelStats | null>(null);
  consumptionReport = signal<FuelConsumptionReport | null>(null);

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
  receiptPhotoPreview = signal<string | null>(null);

  // Filtro
  filterForm = this.fb.group({
    search: [''],
    vehicleId: ['ALL'],
    driverId: ['ALL'],
    fuelType: ['ALL'],
    fullTank: ['ALL'],
  });

  // Formulário de Criação/Edição
  fuelForm!: FormGroup;

  // Tipos de Combustível disponíveis
  readonly fuelTypes: { value: FuelType; label: string }[] = [
    { value: 'GASOLINA', label: 'Gasolina Comum' },
    { value: 'ETANOL', label: 'Etanol' },
    { value: 'DIESEL', label: 'Diesel Comum' },
    { value: 'DIESEL_S10', label: 'Diesel S-10' },
    { value: 'GNV', label: 'GNV' },
    { value: 'ELETRICO', label: 'Elétrico' },
  ];

  ngOnInit(): void {
    this.initForm();
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

    this.loadRecords();
    this.loadStats();

    // Filtros reativos
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
        this.loadRecords();
      });
  }

  private initForm(): void {
    this.fuelForm = this.fb.group({
      vehicleId: ['', Validators.required],
      driverId: [''],
      fuelType: ['GASOLINA', Validators.required],
      liters: [null, [Validators.required, Validators.min(0.01)]],
      pricePerUnit: [null, [Validators.min(0)]],
      totalCost: [null, [Validators.required, Validators.min(0.01)]],
      odometerAtFueling: [null, [Validators.required, Validators.min(0)]],
      gasStation: [''],
      fullTank: [true],
      receiptUrl: [''],
      fueledAt: [new Date().toISOString().slice(0, 16)],
      notes: [''],
    });

    // Recalcula totalCost quando liters ou pricePerUnit mudam
    this.fuelForm.get('liters')?.valueChanges.subscribe((liters) => {
      const price = this.fuelForm.get('pricePerUnit')?.value;
      if (liters && price && price > 0) {
        const total = Math.round(Number(liters) * Number(price) * 100) / 100;
        this.fuelForm.get('totalCost')?.setValue(total, { emitEvent: false });
      }
    });

    this.fuelForm.get('pricePerUnit')?.valueChanges.subscribe((price) => {
      const liters = this.fuelForm.get('liters')?.value;
      if (liters && price && liters > 0) {
        const total = Math.round(Number(liters) * Number(price) * 100) / 100;
        this.fuelForm.get('totalCost')?.setValue(total, { emitEvent: false });
      }
    });

    // Quando seleciona um veículo, sugere o KM atual
    this.fuelForm.get('vehicleId')?.valueChanges.subscribe((vId) => {
      if (vId) {
        const found = this.vehicles().find((v) => v.id === vId);
        if (found && !this.fuelForm.get('odometerAtFueling')?.value) {
          this.fuelForm.get('odometerAtFueling')?.setValue(found.currentKm);
        }
      }
    });
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

  loadConsumptionReport(): void {
    this.isReportLoading.set(true);
    const filter = this.filterForm.value;
    const vehicleId = filter.vehicleId !== 'ALL' ? filter.vehicleId! : undefined;

    this.fuelRepo.getConsumptionReport({ vehicleId }).subscribe({
      next: (res) => {
        this.consumptionReport.set(res);
        this.isReportLoading.set(false);
      },
      error: () => {
        this.isReportLoading.set(false);
        this.toastService.show('Erro ao carregar relatório de consumo.', 'error');
      },
    });
  }

  setTab(tab: 'LIST' | 'REPORT'): void {
    this.activeTab.set(tab);
    if (tab === 'REPORT' && !this.consumptionReport()) {
      this.loadConsumptionReport();
    }
  }

  // --- MODAIS E AÇÕES ---
  openCreateModal(): void {
    this.errorMessage.set(null);
    this.receiptPhotoPreview.set(null);
    this.fuelForm.reset({
      fuelType: 'GASOLINA',
      fullTank: true,
      fueledAt: new Date().toISOString().slice(0, 16),
      receiptUrl: '',
    });

    if (!this.isDriverUser()) {
      this.fuelForm.get('driverId')?.setValidators(Validators.required);
    } else {
      this.fuelForm.get('driverId')?.clearValidators();
    }
    this.fuelForm.get('driverId')?.updateValueAndValidity();

    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.receiptPhotoPreview.set(null);
    this.errorMessage.set(null);
  }

  openEditModal(record: FuelRecord): void {
    this.selectedRecord.set(record);
    this.errorMessage.set(null);
    this.receiptPhotoPreview.set(record.receiptUrl || null);

    this.fuelForm.patchValue({
      vehicleId: record.vehicleId,
      driverId: record.driverId,
      fuelType: record.fuelType,
      liters: record.liters,
      pricePerUnit: record.pricePerUnit,
      totalCost: record.totalCost,
      odometerAtFueling: record.odometerAtFueling,
      gasStation: record.gasStation || '',
      fullTank: record.fullTank,
      receiptUrl: record.receiptUrl || '',
      fueledAt: record.fueledAt ? new Date(record.fueledAt).toISOString().slice(0, 16) : '',
      notes: record.notes || '',
    });

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.receiptPhotoPreview.set(null);
    this.selectedRecord.set(null);
    this.errorMessage.set(null);
  }

  async onReceiptFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      try {
        const compressedBase64 = await compressImage(file, 1280, 1280, 0.75);
        this.receiptPhotoPreview.set(compressedBase64);
        this.fuelForm.get('receiptUrl')?.setValue(compressedBase64);
      } catch (err) {
        console.error('Erro ao comprimir imagem de comprovante:', err);
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result as string;
          this.receiptPhotoPreview.set(res);
          this.fuelForm.get('receiptUrl')?.setValue(res);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeReceiptPhoto(): void {
    this.receiptPhotoPreview.set(null);
    this.fuelForm.get('receiptUrl')?.setValue('');
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
    this.selectedRecord.set(record);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedRecord.set(null);
  }

  submitCreate(): void {
    if (this.fuelForm.invalid) {
      this.fuelForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.fuelForm.value;

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
            this.loadConsumptionReport();
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

  submitEdit(): void {
    if (this.fuelForm.invalid || !this.selectedRecord()) {
      this.fuelForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.fuelForm.value;

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
            this.loadConsumptionReport();
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
          this.loadConsumptionReport();
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

  getSelectedVehicleKm(): number | null {
    const vId = this.fuelForm.get('vehicleId')?.value;
    if (!vId) return null;
    const v = this.vehicles().find((veh) => veh.id === vId);
    return v ? v.currentKm : null;
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
