import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef
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
  LucideFuel
} from '@lucide/angular';

Chart.register(...registerables);

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
    LucideFuel
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

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
                backgroundColor: total > 0 ? ['#10b981', '#f59e0b', '#3b82f6'] : ['#e2e8f0'],
                hoverBackgroundColor: total > 0 ? ['#059669', '#d97706', '#2563eb'] : ['#cbd5e1'],
                borderWidth: 3,
                borderColor: '#ffffff',
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
                backgroundColor: '#0f172a',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
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

    // 2. Bar Chart: Distribuição Operacional Semanal
    if (this.activityChartCanvas?.nativeElement) {
      const ctx = this.activityChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const completedTrips = [4, 6, 8, 7, 9, 5, 2];
        const ongoingTrips = [2, 3, 2, 4, 3, 1, 1];

        this.activityChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weekdays,
            datasets: [
              {
                label: 'Viagens Concluídas',
                data: completedTrips,
                backgroundColor: '#10b981',
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.7
              },
              {
                label: 'Em Andamento',
                data: ongoingTrips,
                backgroundColor: '#3b82f6',
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
                  color: '#64748b'
                }
              },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                cornerRadius: 8
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#94a3b8',
                  font: {
                    size: 11
                  }
                }
              },
              y: {
                grid: {
                  color: '#f1f5f9'
                },
                ticks: {
                  color: '#94a3b8',
                  font: {
                    size: 11
                  },
                  stepSize: 2
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
  }
}
