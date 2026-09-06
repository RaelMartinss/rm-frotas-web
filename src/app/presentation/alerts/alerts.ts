import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { ITripRepository } from '../../domain/repositories/trip.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import {
  LucideBell,
  LucideAlertTriangle,
  LucideShieldAlert,
  LucideInfo,
  LucideSearch,
  LucideX,
  LucideCheck,
  LucideCheckCircle2,
  LucideArrowRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight
} from '@lucide/angular';

export interface AlertDetailItem {
  id: string;
  type: 'DANGER' | 'WARNING' | 'INFO';
  category: 'DOCUMENTAÇÃO' | 'MANUTENÇÃO' | 'OPERAÇÃO' | 'SISTEMA';
  title: string;
  description: string;
  timeAgo: string;
  link?: string;
  resolved: boolean;
  actionText?: string;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideBell,
    LucideAlertTriangle,
    LucideShieldAlert,
    LucideInfo,
    LucideSearch,
    LucideX,
    LucideCheck,
    LucideCheckCircle2,
    LucideArrowRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight
  ],
  templateUrl: './alerts.html'
})
export class AlertsComponent implements OnInit {
  private readonly dashboardRepository = inject(IDashboardRepository);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly tripRepository = inject(ITripRepository);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  loading = signal<boolean>(true);
  alerts = signal<AlertDetailItem[]>([]);

  // Filtros
  searchControl = new FormControl('', { nonNullable: true });
  selectedSeverityFilter = signal<'ALL' | 'DANGER' | 'WARNING' | 'INFO'>('ALL');
  hideResolved = signal<boolean>(true);

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // --- PAGINAÇÃO (MÁXIMO 10 POR PÁGINA) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [10, 25, 50];

  // Contadores para KPIs
  totalActiveAlerts = computed(() => this.alerts().filter((a) => !a.resolved).length);
  dangerCount = computed(() => this.alerts().filter((a) => a.type === 'DANGER' && !a.resolved).length);
  warningCount = computed(() => this.alerts().filter((a) => a.type === 'WARNING' && !a.resolved).length);
  infoCount = computed(() => this.alerts().filter((a) => a.type === 'INFO' && !a.resolved).length);

  filteredAlerts = computed(() => {
    const list = this.alerts();
    const term = this.searchTerm().toLowerCase().trim();
    const severity = this.selectedSeverityFilter();
    const hide = this.hideResolved();

    return list.filter((alert) => {
      if (hide && alert.resolved) return false;

      const matchesSearch =
        alert.title.toLowerCase().includes(term) ||
        alert.description.toLowerCase().includes(term) ||
        alert.category.toLowerCase().includes(term);

      const matchesSeverity = severity === 'ALL' || alert.type === severity;

      return matchesSearch && matchesSeverity;
    });
  });

  totalItems = computed(() => this.filteredAlerts().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  displayedAlerts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredAlerts().slice(start, start + this.pageSize());
  });

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

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
      });

    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading.set(true);

    Promise.all([
      new Promise<any[]>((resolve) => {
        this.vehicleRepository.getAll({ limit: 100 }).subscribe({
          next: (res) => resolve(res.data || []),
          error: () => resolve([])
        });
      }),
      new Promise<any[]>((resolve) => {
        this.driverRepository.getAll({ limit: 100 }).subscribe({
          next: (res) => resolve(res.data || []),
          error: () => resolve([])
        });
      }),
      new Promise<any[]>((resolve) => {
        this.tripRepository.getAll({ limit: 100 }).subscribe({
          next: (res) => resolve(res.data || []),
          error: () => resolve([])
        });
      })
    ]).then(([vehicles, drivers, trips]) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const alertList: AlertDetailItem[] = [];

      // 1. CRLVs Vencidos ou Próximos
      for (const v of vehicles) {
        if (v.crlvExpiration) {
          const expDate = new Date(v.crlvExpiration);
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            alertList.push({
              id: `crlv-exp-${v.id}`,
              type: 'DANGER',
              category: 'DOCUMENTAÇÃO',
              title: `CRLV Vencido: ${v.brand ? v.brand + ' ' : ''}${v.model} (${v.plate})`,
              description: `O documento CRLV venceu há ${-diffDays} dias. Veículo irregular para circulação em via pública.`,
              timeAgo: 'Urgente',
              link: '/veiculos',
              actionText: 'Regularizar Veículo',
              resolved: false
            });
          } else if (diffDays <= 30) {
            alertList.push({
              id: `crlv-soon-${v.id}`,
              type: 'WARNING',
              category: 'DOCUMENTAÇÃO',
              title: `CRLV a Vencer: ${v.plate}`,
              description: `Vencimento previsto para ${expDate.toLocaleDateString('pt-BR')} (${diffDays} dias restantes).`,
              timeAgo: `${diffDays}d restantes`,
              link: '/veiculos',
              actionText: 'Ver Veículo',
              resolved: false
            });
          }
        }

        // Veículo em manutenção
        if (v.status === 'IN_MAINTENANCE' || v.status === 'MANUTENCAO') {
          alertList.push({
            id: `maint-${v.id}`,
            type: 'WARNING',
            category: 'MANUTENÇÃO',
            title: `Veículo em Manutenção: ${v.plate}`,
            description: `O veículo ${v.model} está alocado em oficina e indisponível para despacho de viagens.`,
            timeAgo: 'Em oficina',
            link: '/veiculos',
            actionText: 'Acompanhar Oficina',
            resolved: false
          });
        }
      }

      // 2. CNHs Vencidas ou Próximas
      for (const d of drivers) {
        const cnhExp = d.cnh?.expirationDate || d.cnhExpiration || d.cnhExpirationDate;
        if (cnhExp) {
          const expDate = new Date(cnhExp);
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            alertList.push({
              id: `cnh-exp-${d.id}`,
              type: 'DANGER',
              category: 'DOCUMENTAÇÃO',
              title: `CNH Vencida: ${d.name}`,
              description: `A habilitação Cat. ${d.cnh?.category || d.cnhCategory || 'D'} venceu há ${-diffDays} dias. Motorista bloqueado para novas escalas.`,
              timeAgo: 'Urgente',
              link: '/motoristas',
              actionText: 'Renovar CNH',
              resolved: false
            });
          } else if (diffDays <= 30) {
            alertList.push({
              id: `cnh-soon-${d.id}`,
              type: 'WARNING',
              category: 'DOCUMENTAÇÃO',
              title: `CNH a Vencer em Breve: ${d.name}`,
              description: `Validade até ${expDate.toLocaleDateString('pt-BR')} (${diffDays} dias restantes).`,
              timeAgo: `${diffDays}d restantes`,
              link: '/motoristas',
              actionText: 'Ver Condutor',
              resolved: false
            });
          }
        }
      }

      // 3. Viagens em Andamento
      const inProgressTrips = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'EM_ANDAMENTO');
      for (const trip of inProgressTrips) {
        alertList.push({
          id: `trip-${trip.id}`,
          type: 'INFO',
          category: 'OPERAÇÃO',
          title: `Viagem em Trânsito: ${trip.origin} → ${trip.destination}`,
          description: `Despacho ativo no sistema. Acompanhe a entrega e liberação do veículo.`,
          timeAgo: 'Em andamento',
          link: '/viagens',
          actionText: 'Ver Viagem',
          resolved: false
        });
      }

      // Mensagem informativa de sistema caso nenhum alerta esteja aberto
      if (alertList.length === 0) {
        alertList.push({
          id: 'sys-clean',
          type: 'INFO',
          category: 'SISTEMA',
          title: 'Sistema Operando em Conformidade',
          description: 'Não há pendências críticas de documentação ou viagens com inconformidades no momento.',
          timeAgo: 'Hoje',
          resolved: false
        });
      }

      this.alerts.set(alertList);
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
      this.toastService.error('Erro ao carregar central de alertas.');
    });
  }

  setSeverityFilter(severity: 'ALL' | 'DANGER' | 'WARNING' | 'INFO'): void {
    this.selectedSeverityFilter.set(severity);
    this.currentPage.set(1);
  }

  toggleHideResolved(): void {
    this.hideResolved.update((v) => !v);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.selectedSeverityFilter.set('ALL');
    this.currentPage.set(1);
  }

  resolveAlert(alert: AlertDetailItem): void {
    this.alerts.update((list) =>
      list.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a))
    );
    this.toastService.success('Alerta marcado como resolvido.');
  }

  resolveAllAlerts(): void {
    this.alerts.update((list) =>
      list.map((a) => ({ ...a, resolved: true }))
    );
    this.toastService.success('Todos os alertas foram marcados como resolvidos.');
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
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
  }

  navigateTo(url?: string): void {
    if (url) {
      this.router.navigateByUrl(url);
    }
  }
}
