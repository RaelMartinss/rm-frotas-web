import { Component, inject, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

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
  FuelEfficiencyReportResponse,
  FuelConsumptionCycle,
  GetEfficiencyReportParams,
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
  LucideTrendingUp,
  LucideRefreshCw,
  LucideAlertTriangle,
  LucideCalendar,
  LucideHelpCircle,
} from '@lucide/angular';

@Component({
  selector: 'app-fuel-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
    LucideTrendingUp,
    LucideRefreshCw,
    LucideAlertTriangle,
    LucideCalendar,
    LucideHelpCircle,
  ],
  templateUrl: './fuel-list.html',
  styleUrl: './fuel-list.css',
})
export class FuelListComponent implements OnInit, OnDestroy {
  private readonly fuelRepo = inject(IFuelRepository);
  private readonly vehicleRepo = inject(IVehicleRepository);
  private readonly driverRepo = inject(IDriverRepository);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  protected readonly impersonationService = inject(ImpersonationService);

  // --- SIGNALS DE ESTADO ---
  activeTab = signal<'LIST' | 'REPORT'>('LIST');

  fuelRecords = signal<FuelRecord[]>([]);
  vehicles = signal<Vehicle[]>([]);
  drivers = signal<Driver[]>([]);
  stats = signal<FuelStats | null>(null);
  consumptionReport = signal<FuelConsumptionReport | null>(null);

  // Relatório de Eficiência (Novo Motor V1)
  readonly efficiencyReport = signal<FuelEfficiencyReportResponse | null>(null);
  readonly isEfficiencyLoading = signal<boolean>(false);
  readonly reportPreset = signal<string>('LAST_30_DAYS');
  readonly reportStartDate = signal<string>('');
  readonly reportEndDate = signal<string>('');
  readonly reportVehicleId = signal<string>('ALL');
  readonly reportFuelType = signal<string>('ALL');
  readonly reportComparePrevious = signal<boolean>(false);

  // Modal de Auditoria de Ciclo
  readonly selectedCycle = signal<FuelConsumptionCycle | null>(null);
  readonly isCycleDetailsModalOpen = signal<boolean>(false);

  // Canvas dos 5 Gráficos
  @ViewChild('consumptionChartCanvas') consumptionChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('costChartCanvas') costChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('volumeChartCanvas') volumeChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('priceChartCanvas') priceChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChartCanvas') distributionChartCanvas?: ElementRef<HTMLCanvasElement>;

  private consumptionChartInstance: Chart | null = null;
  private costChartInstance: Chart | null = null;
  private volumeChartInstance: Chart | null = null;
  private priceChartInstance: Chart | null = null;
  private distributionChartInstance: Chart | null = null;

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

  getPresetDates(preset: string): { startDate: string; endDate: string } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (preset) {
      case 'TODAY': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      case 'LAST_7_DAYS': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      case 'LAST_30_DAYS': {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      case 'LAST_90_DAYS': {
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      case 'THIS_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      case 'LAST_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { startDate: start.toISOString().slice(0, 10), endDate: lastDay.toISOString().slice(0, 10) };
      }
      case 'THIS_YEAR': {
        const start = new Date(now.getFullYear(), 0, 1);
        return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
      }
      default:
        return {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        };
    }
  }

  onPresetChange(preset: string): void {
    this.reportPreset.set(preset);
    if (preset !== 'CUSTOM') {
      const dates = this.getPresetDates(preset);
      this.reportStartDate.set(dates.startDate);
      this.reportEndDate.set(dates.endDate);
      this.loadEfficiencyReport();
    }
  }

  loadEfficiencyReport(): void {
    this.isEfficiencyLoading.set(true);

    const params: GetEfficiencyReportParams = {
      startDate: this.reportStartDate() ? `${this.reportStartDate()}T00:00:00.000Z` : undefined,
      endDate: this.reportEndDate() ? `${this.reportEndDate()}T23:59:59.999Z` : undefined,
      vehicleId: this.reportVehicleId() !== 'ALL' ? this.reportVehicleId() : undefined,
      fuelType: this.reportFuelType() !== 'ALL' ? (this.reportFuelType() as FuelType) : undefined,
      comparePreviousPeriod: this.reportComparePrevious(),
    };

    this.fuelRepo.getEfficiencyReport(params).subscribe({
      next: (res) => {
        this.efficiencyReport.set(res);
        this.isEfficiencyLoading.set(false);
        setTimeout(() => this.renderEfficiencyCharts(), 80);
      },
      error: () => {
        this.isEfficiencyLoading.set(false);
        this.toastService.show('Erro ao carregar relatório de eficiência.', 'error');
      },
    });
  }

  setTab(tab: 'LIST' | 'REPORT'): void {
    this.activeTab.set(tab);
    if (tab === 'REPORT') {
      if (!this.reportStartDate()) {
        const dates = this.getPresetDates(this.reportPreset());
        this.reportStartDate.set(dates.startDate);
        this.reportEndDate.set(dates.endDate);
      }
      this.loadEfficiencyReport();
    } else {
      this.destroyEfficiencyCharts();
    }
  }

  openCycleDetails(cycle: FuelConsumptionCycle): void {
    this.selectedCycle.set(cycle);
    this.isCycleDetailsModalOpen.set(true);
  }

  closeCycleDetails(): void {
    this.isCycleDetailsModalOpen.set(false);
    this.selectedCycle.set(null);
  }

  private renderEfficiencyCharts(): void {
    const report = this.efficiencyReport();
    if (!report) return;

    this.destroyEfficiencyCharts();

    // 1. Gráfico 1: Evolução do Consumo (Line Chart)
    if (this.consumptionChartCanvas?.nativeElement && report.consumptionEvolution.length > 0) {
      const ctx = this.consumptionChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = report.consumptionEvolution.map((p) => {
          const d = new Date(p.date);
          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        });
        const data = report.consumptionEvolution.map((p) => p.kmPerLiter);

        this.consumptionChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Consumo (km/L)',
                data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: 4.5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#10b981',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                callbacks: {
                  afterLabel: (tooltipItem) => {
                    const idx = tooltipItem.dataIndex;
                    const item = report.consumptionEvolution[idx];
                    if (!item) return '';
                    return [
                      `Veículo: ${item.vehiclePlate}`,
                      `Distância: ${item.distanceKm.toLocaleString('pt-BR')} km`,
                      `Combustível: ${item.fuelConsumed.toFixed(2)} L`,
                      `Custo: R$ ${item.totalCost.toFixed(2)}`,
                    ];
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                grid: { color: 'rgba(226, 232, 240, 0.6)' },
                ticks: {
                  callback: (val) => `${val} km/L`,
                  color: '#64748b',
                  font: { size: 11 },
                },
              },
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 11 } },
              },
            },
          },
        });
      }
    }

    // 2. Gráfico 2: Evolução dos Gastos (Bar Chart)
    if (this.costChartCanvas?.nativeElement && report.costEvolution.length > 0) {
      const ctx = this.costChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = report.costEvolution.map((p) => {
          const parts = p.date.split('-');
          return `${parts[2]}/${parts[1]}`;
        });
        const data = report.costEvolution.map((p) => p.value);

        this.costChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Gastos (R$)',
                data,
                backgroundColor: '#6366f1',
                borderRadius: 6,
                hoverBackgroundColor: '#4f46e5',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                callbacks: {
                  label: (context) => ` R$ ${(context.raw as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(226, 232, 240, 0.6)' },
                ticks: {
                  callback: (val) => `R$ ${val}`,
                  color: '#64748b',
                  font: { size: 10 },
                },
              },
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } },
              },
            },
          },
        });
      }
    }

    // 3. Gráfico 3: Volume de Combustível (Bar Chart)
    if (this.volumeChartCanvas?.nativeElement && report.volumeEvolution.length > 0) {
      const ctx = this.volumeChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = report.volumeEvolution.map((p) => {
          const parts = p.date.split('-');
          return `${parts[2]}/${parts[1]}`;
        });
        const data = report.volumeEvolution.map((p) => p.value);

        this.volumeChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Volume (L)',
                data,
                backgroundColor: '#0ea5e9',
                borderRadius: 6,
                hoverBackgroundColor: '#0284c7',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                callbacks: {
                  label: (context) => ` ${(context.raw as number).toFixed(2)} L`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(226, 232, 240, 0.6)' },
                ticks: {
                  callback: (val) => `${val} L`,
                  color: '#64748b',
                  font: { size: 10 },
                },
              },
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } },
              },
            },
          },
        });
      }
    }

    // 4. Gráfico 4: Preço Médio Ponderado (Line Chart)
    if (this.priceChartCanvas?.nativeElement && report.priceEvolution.length > 0) {
      const ctx = this.priceChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = report.priceEvolution.map((p) => {
          const parts = p.date.split('-');
          return `${parts[2]}/${parts[1]}`;
        });
        const data = report.priceEvolution.map((p) => p.value);

        this.priceChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Preço Médio (R$/L)',
                data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.25,
                pointRadius: 4,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                callbacks: {
                  label: (context) => ` R$ ${(context.raw as number).toFixed(2)} / L`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                grid: { color: 'rgba(226, 232, 240, 0.6)' },
                ticks: {
                  callback: (val) => `R$ ${val}`,
                  color: '#64748b',
                  font: { size: 10 },
                },
              },
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } },
              },
            },
          },
        });
      }
    }

    // 5. Gráfico 5: Distribuição por Combustível (Horizontal Bar Chart)
    if (this.distributionChartCanvas?.nativeElement && report.fuelDistribution.length > 0) {
      const ctx = this.distributionChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = report.fuelDistribution.map((d) => d.label);
        const data = report.fuelDistribution.map((d) => d.percentage);
        const colors = ['#10b981', '#6366f1', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

        this.distributionChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 6,
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                callbacks: {
                  label: (context) => {
                    const idx = context.dataIndex;
                    const item = report.fuelDistribution[idx];
                    return ` ${item.percentage}% (${item.totalLiters.toFixed(2)} L • R$ ${item.totalCost.toFixed(2)})`;
                  },
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(226, 232, 240, 0.6)' },
                ticks: {
                  callback: (val) => `${val}%`,
                  color: '#64748b',
                  font: { size: 10 },
                },
              },
              y: {
                grid: { display: false },
                ticks: { color: '#334155', font: { size: 11, weight: 'bold' } },
              },
            },
          },
        });
      }
    }
  }

  private destroyEfficiencyCharts(): void {
    if (this.consumptionChartInstance) {
      this.consumptionChartInstance.destroy();
      this.consumptionChartInstance = null;
    }
    if (this.costChartInstance) {
      this.costChartInstance.destroy();
      this.costChartInstance = null;
    }
    if (this.volumeChartInstance) {
      this.volumeChartInstance.destroy();
      this.volumeChartInstance = null;
    }
    if (this.priceChartInstance) {
      this.priceChartInstance.destroy();
      this.priceChartInstance = null;
    }
    if (this.distributionChartInstance) {
      this.distributionChartInstance.destroy();
      this.distributionChartInstance = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyEfficiencyCharts();
  }

  // --- MODAIS E AÇÕES ---
  openCreateModal(): void {
    if (this.impersonationService.isReadOnly()) return;
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
    if (this.impersonationService.isReadOnly()) return;
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
    if (this.impersonationService.isReadOnly()) return;
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
            this.loadEfficiencyReport();
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
            this.loadEfficiencyReport();
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
          this.loadEfficiencyReport();
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
