import {
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { IFuelRepository } from '../../../../domain/repositories/fuel.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { ImpersonationService } from '../../../../core/services/impersonation.service';
import {
  FuelConsumptionCycle,
  FuelEfficiencyReportResponse,
  FuelType,
  GetEfficiencyReportParams,
} from '../../../../domain/models/fuel.model';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { FuelCycleDetailsModalComponent } from '../fuel-cycle-details-modal/fuel-cycle-details-modal.component';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideCalendar,
  LucideDollarSign,
  LucideFuel,
  LucideGauge,
  LucideHelpCircle,
  LucideInfo,
  LucideLayers,
  LucideLoader2,
  LucideRefreshCw,
  LucideTrendingUp,
  LucideTruck,
} from '@lucide/angular';

@Component({
  selector: 'app-fuel-efficiency-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FuelCycleDetailsModalComponent,
    LucideCalendar,
    LucideTruck,
    LucideFuel,
    LucideRefreshCw,
    LucideLoader2,
    LucideDollarSign,
    LucideTrendingUp,
    LucideLayers,
    LucideGauge,
    LucideHelpCircle,
    LucideInfo,
    LucideAlertTriangle,
    LucideAlertCircle,
  ],
  templateUrl: './fuel-efficiency-report.component.html',
})
export class FuelEfficiencyReportComponent implements OnInit, OnDestroy {
  private readonly fuelRepo = inject(IFuelRepository);
  private readonly toastService = inject(ToastService);
  protected readonly impersonationService = inject(ImpersonationService);

  vehicles = input<Vehicle[]>([]);
  fuelTypes = input<{ value: FuelType; label: string }[]>([]);

  openCreateFueling = output<void>();

  // Filtros do Relatório
  reportPreset = signal<string>('THIS_MONTH');
  reportStartDate = signal<string>('');
  reportEndDate = signal<string>('');
  reportVehicleId = signal<string>('ALL');
  reportFuelType = signal<string>('ALL');
  reportComparePrevious = signal<boolean>(false);

  // Estado dos Dados
  efficiencyReport = signal<FuelEfficiencyReportResponse | null>(null);
  isEfficiencyLoading = signal<boolean>(false);

  // Modal de Detalhes do Ciclo
  selectedCycle = signal<FuelConsumptionCycle | null>(null);
  isCycleDetailsModalOpen = signal<boolean>(false);

  // Canvas dos Gráficos
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

  ngOnInit(): void {
    if (!this.reportStartDate()) {
      const dates = this.getPresetDates(this.reportPreset());
      this.reportStartDate.set(dates.startDate);
      this.reportEndDate.set(dates.endDate);
    }
    this.loadEfficiencyReport();
  }

  ngOnDestroy(): void {
    this.destroyEfficiencyCharts();
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
                  label: (context) =>
                    ` R$ ${(context.raw as number).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
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
}
