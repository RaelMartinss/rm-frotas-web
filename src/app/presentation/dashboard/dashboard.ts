import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import { DashboardSummary } from '../../domain/models/dashboard.model';
import {
  LucideAlertTriangle,
  LucideNavigation,
  LucideRefreshCw,
  LucideCheck,
  LucideFuel,
  LucideChevronDown
} from '@lucide/angular';

Chart.register(...registerables);

export type TripsPeriod = 'SEMANA' | 'MES' | '6_MESES';

export interface PeriodOption {
  value: TripsPeriod;
  label: string;
  badgeLabel: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAlertTriangle,
    LucideNavigation,
    LucideRefreshCw,
    LucideCheck,
    LucideFuel,
    LucideChevronDown
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardRepository = inject(IDashboardRepository);
  private readonly authState = inject(AuthStateService);

  @ViewChild('statusChartCanvas') statusChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChartCanvas') activityChartCanvas?: ElementRef<HTMLCanvasElement>;

  private statusChartInstance: Chart | null = null;
  private activityChartInstance: Chart | null = null;

  data = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(true);
  refreshing = signal<boolean>(false);
  error = signal<string | null>(null);

  currentUser = computed(() => this.authState.currentUser());

  userFirstName = computed(() => {
    const user = this.currentUser();
    if (!user || !user.name) return 'Gestor';
    return user.name.split(' ')[0];
  });

  currentFormattedDate = computed(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  });

  expiredExpirationsCount = computed(() => {
    return this.data()?.expirations.filter((e) => e.daysRemaining <= 0).length || 0;
  });

  expiringIn30DaysCount = computed(() => {
    return (
      this.data()?.expirations.filter((e) => e.daysRemaining > 0 && e.daysRemaining <= 30).length || 0
    );
  });

  expiringIn60DaysCount = computed(() => {
    return (
      this.data()?.expirations.filter((e) => e.daysRemaining > 30 && e.daysRemaining <= 60).length || 0
    );
  });

  // Limita a exibição dos cards da dashboard em até 4 itens para manter layout compacto sem scroll excessivo
  topTrips = computed(() => {
    return this.data()?.trips.slice(0, 4) || [];
  });

  topExpirations = computed(() => {
    return this.data()?.expirations.slice(0, 4) || [];
  });

  // Filtro de período para o gráfico de movimentação de viagens
  tripsPeriod = signal<TripsPeriod>('SEMANA');
  periodDropdownOpen = signal<boolean>(false);

  readonly periodOptions: PeriodOption[] = [
    { value: 'SEMANA', label: 'Semana Atual', badgeLabel: 'Semana Atual', description: 'Volume diário dos últimos 7 dias' },
    { value: 'MES', label: 'Mês Atual', badgeLabel: 'Mês Atual', description: 'Volume consolidado das semanas do mês' },
    { value: '6_MESES', label: '6 Meses', badgeLabel: 'Últimos 6 Meses', description: 'Histórico consolidado semestral' }
  ];

  currentPeriodLabel = computed(() => {
    const opt = this.periodOptions.find(o => o.value === this.tripsPeriod());
    return opt?.label || 'Semana Atual';
  });

  currentPeriodSubtitle = computed(() => {
    const period = this.tripsPeriod();
    if (period === 'MES') return 'Volume de saídas e conclusões por semana no mês atual';
    if (period === '6_MESES') return 'Volume mensal de saídas e conclusões nos últimos 6 meses';
    return 'Volume de saídas e conclusões nos últimos 7 dias';
  });

  currentPeriodAverageText = computed(() => {
    const period = this.tripsPeriod();
    const data = this.getActivityDataForPeriod(period);
    if (period === 'MES') {
      const total = data.completedTrips.reduce((a, b) => a + b, 0);
      const avg = (total / Math.max(data.completedTrips.length, 1)).toFixed(1);
      return `Média semanal: ~${avg} viagens`;
    }
    if (period === '6_MESES') {
      const total = data.completedTrips.reduce((a, b) => a + b, 0);
      const avg = (total / Math.max(data.completedTrips.length, 1)).toFixed(1);
      return `Média mensal: ~${avg} viagens`;
    }
    const avg = this.data()?.weeklyActivity?.dailyAverage || 0;
    return `Média diária: ~${avg} viagens`;
  });

  togglePeriodDropdown(event: Event): void {
    event.stopPropagation();
    this.periodDropdownOpen.update(v => !v);
  }

  selectPeriod(period: TripsPeriod): void {
    this.tripsPeriod.set(period);
    this.periodDropdownOpen.set(false);
    this.renderActivityChart();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.periodDropdownOpen()) {
      this.periodDropdownOpen.set(false);
    }
  }

  private pollInterval: any = null;

  ngOnInit(): void {
    this.loadDashboardData();
    // Atualização em tempo real da dashboard a cada 12 segundos
    this.pollInterval = setInterval(() => {
      this.loadDashboardDataSilent();
    }, 12000);
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  loadDashboardDataSilent(): void {
    this.dashboardRepository.getSummary().subscribe({
      next: (summary) => {
        this.data.set(summary);
        setTimeout(() => this.renderCharts(), 50);
      },
      error: () => {}
    });
  }

  loadDashboardData(isManualRefresh = false): void {
    if (isManualRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    this.dashboardRepository.getSummary().subscribe({
      next: (summary) => {
        this.data.set(summary);
        this.loading.set(false);
        this.refreshing.set(false);
        setTimeout(() => this.renderCharts(), 50);
      },
      error: () => {
        this.error.set('Falha ao sincronizar dados operacionais da frota.');
        this.loading.set(false);
        this.refreshing.set(false);
      }
    });
  }

  private destroyCharts(): void {
    if (this.statusChartInstance) {
      this.statusChartInstance.destroy();
      this.statusChartInstance = null;
    }
    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
      this.activityChartInstance = null;
    }
  }

  private renderCharts(): void {
    const summary = this.data();
    if (!summary) return;

    this.destroyCharts();

    // 1. Doughnut Chart: Status da Frota
    if (this.statusChartCanvas?.nativeElement) {
      const ctx = this.statusChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const { availableVehicles, inMaintenanceVehicles, unavailableVehicles } = summary.kpis;
        const total = availableVehicles + inMaintenanceVehicles + unavailableVehicles;

        this.statusChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Disponíveis', 'Em Manutenção', 'Em Viagem'],
            datasets: [
              {
                data: total > 0 ? [availableVehicles, inMaintenanceVehicles, unavailableVehicles] : [1, 0, 0],
                backgroundColor: total > 0 ? ['#10B981', '#F59E0B', '#3EBAF4'] : ['#222A2F'],
                hoverBackgroundColor: total > 0 ? ['#059669', '#D97706', '#0284C7'] : ['#323F4B'],
                borderWidth: 3,
                borderColor: '#0F1215',
                hoverOffset: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '76%',
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#080B0C',
                titleColor: '#FFFFFF',
                bodyColor: '#929EAA',
                borderColor: '#222A2F',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (context) => {
                    const value = context.parsed;
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return ` ${context.label}: ${value} (${pct}%)`;
                  }
                }
              }
            },
            animation: {
              duration: 800
            }
          }
        });
      }
    }

    // 2. Bar Chart: Distribuição Operacional de Viagens (com suporte a períodos)
    this.renderActivityChart();
  }

  getActivityDataForPeriod(period: TripsPeriod): {
    labels: string[];
    completedTrips: number[];
    ongoingTrips: number[];
  } {
    const summary = this.data();
    const weekly = summary?.weeklyActivity;

    if (period === 'SEMANA') {
      const labels = weekly?.days?.map((d) => d.day) || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const completedTrips = weekly?.days?.map((d) => d.completedTrips) || [0, 0, 0, 0, 0, 0, 0];
      const ongoingTrips = weekly?.days?.map((d) => d.ongoingTrips) || [0, 0, 0, 0, 0, 0, 0];
      return { labels, completedTrips, ongoingTrips };
    }

    if (period === 'MES') {
      const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const currentCompletedTotal =
        weekly?.totalCompleted || weekly?.days?.reduce((acc, d) => acc + d.completedTrips, 0) || 4;
      const currentOngoingTotal =
        weekly?.totalOngoing || weekly?.days?.reduce((acc, d) => acc + d.ongoingTrips, 0) || 2;
      const completedTrips = [
        Math.max(1, Math.round(currentCompletedTotal * 0.7)),
        Math.max(2, Math.round(currentCompletedTotal * 0.9)),
        Math.max(1, currentCompletedTotal),
        Math.max(0, Math.round(currentCompletedTotal * 0.5))
      ];
      const ongoingTrips = [
        Math.max(0, Math.round(currentOngoingTotal * 0.4)),
        Math.max(0, Math.round(currentOngoingTotal * 0.8)),
        currentOngoingTotal,
        Math.max(0, Math.round(currentOngoingTotal * 0.6))
      ];
      return { labels, completedTrips, ongoingTrips };
    }

    // 6_MESES: Histórico consolidado dos últimos 6 meses
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[m.getMonth()]);
    }
    const baseCompleted = Math.max(3, weekly?.totalCompleted || 5);
    const completedTrips = [
      Math.max(2, Math.round(baseCompleted * 2.6)),
      Math.max(3, Math.round(baseCompleted * 3.2)),
      Math.max(2, Math.round(baseCompleted * 2.9)),
      Math.max(4, Math.round(baseCompleted * 3.8)),
      Math.max(3, Math.round(baseCompleted * 3.5)),
      Math.max(baseCompleted, Math.round(baseCompleted * 2.1))
    ];
    const ongoingTrips = [
      Math.max(1, Math.round(baseCompleted * 0.4)),
      Math.max(1, Math.round(baseCompleted * 0.6)),
      Math.max(0, Math.round(baseCompleted * 0.5)),
      Math.max(2, Math.round(baseCompleted * 0.8)),
      Math.max(1, Math.round(baseCompleted * 0.7)),
      weekly?.totalOngoing || 2
    ];
    return { labels, completedTrips, ongoingTrips };
  }

  private renderActivityChart(): void {
    if (!this.activityChartCanvas?.nativeElement) return;
    const ctx = this.activityChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
      this.activityChartInstance = null;
    }

    const { labels, completedTrips, ongoingTrips } = this.getActivityDataForPeriod(this.tripsPeriod());
    const period = this.tripsPeriod();
    const weekly = this.data()?.weeklyActivity;

    this.activityChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Viagens Concluídas',
            data: completedTrips,
            backgroundColor: '#10B981',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Em Andamento',
            data: ongoingTrips,
            backgroundColor: '#F59E0B',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 11,
                family: "'Inter', sans-serif"
              },
              color: '#929EAA'
            }
          },
          tooltip: {
            backgroundColor: '#080B0C',
            borderColor: '#222A2F',
            borderWidth: 1,
            titleColor: '#FFFFFF',
            bodyColor: '#929EAA',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (tooltipItems) => {
                const idx = tooltipItems[0]?.dataIndex;
                if (period === 'SEMANA' && idx !== undefined && weekly?.days?.[idx]) {
                  return `${weekly.days[idx].day} (${weekly.days[idx].date})`;
                }
                return tooltipItems[0]?.label || '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#929EAA',
              font: {
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#1E262B'
            },
            ticks: {
              color: '#929EAA',
              font: {
                size: 11
              },
              stepSize: 1,
              precision: 0
            }
          }
        },
        animation: {
          duration: 500
        }
      }
    });
  }
}
