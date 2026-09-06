import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { IVehicleRepository } from '../../domain/repositories/vehicle.repository.interface';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import {
  LucideClock,
  LucideAlertTriangle,
  LucideSearch,
  LucideX,
  LucideIdCard,
  LucideTruck,
  LucideCheckCircle2,
  LucideCalendar,
  LucideArrowRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideShieldAlert
} from '@lucide/angular';

export interface ExpirationItem {
  id: string;
  type: 'CNH' | 'CRLV';
  title: string;
  identifier: string; // Placa ou Nº CNH
  categoryOrModel: string; // Ex: Cat. D ou Volvo FH 540
  expirationDate: Date;
  daysRemaining: number;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'REGULAR';
  targetUrl: string;
}

@Component({
  selector: 'app-expirations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideClock,
    LucideAlertTriangle,
    LucideSearch,
    LucideX,
    LucideIdCard,
    LucideTruck,
    LucideCheckCircle2,
    LucideCalendar,
    LucideArrowRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideShieldAlert
  ],
  templateUrl: './expirations.html'
})
export class ExpirationsComponent implements OnInit {
  private readonly dashboardRepository = inject(IDashboardRepository);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  loading = signal<boolean>(true);
  items = signal<ExpirationItem[]>([]);

  // Filtros
  searchControl = new FormControl('', { nonNullable: true });
  selectedTypeFilter = signal<'ALL' | 'CNH' | 'CRLV'>('ALL');
  selectedStatusFilter = signal<'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'REGULAR'>('ALL');

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

  // Métricas para KPI cards
  totalMonitored = computed(() => this.items().length);
  totalExpired = computed(() => this.items().filter((i) => i.status === 'EXPIRED').length);
  totalExpiringSoon = computed(() => this.items().filter((i) => i.status === 'EXPIRING_SOON').length);
  totalRegular = computed(() => this.items().filter((i) => i.status === 'REGULAR').length);

  filteredItems = computed(() => {
    const list = this.items();
    const term = this.searchTerm().toLowerCase().trim();
    const type = this.selectedTypeFilter();
    const status = this.selectedStatusFilter();

    return list.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(term) ||
        item.identifier.toLowerCase().includes(term) ||
        item.categoryOrModel.toLowerCase().includes(term);

      const matchesType = type === 'ALL' || item.type === type;
      const matchesStatus = status === 'ALL' || item.status === status;

      return matchesSearch && matchesType && matchesStatus;
    });
  });

  totalItems = computed(() => this.filteredItems().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  displayedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
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

    this.loadExpirations();
  }

  loadExpirations(): void {
    this.loading.set(true);

    // Carrega dados de veículos e motoristas para construir a lista consolidada de expirações
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
      })
    ]).then(([vehicles, drivers]) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const expirationList: ExpirationItem[] = [];

      // CRLV de veículos
      for (const v of vehicles) {
        if (v.crlvExpiration) {
          const expDate = new Date(v.crlvExpiration);
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let status: 'EXPIRED' | 'EXPIRING_SOON' | 'REGULAR' = 'REGULAR';
          if (diffDays < 0) status = 'EXPIRED';
          else if (diffDays <= 30) status = 'EXPIRING_SOON';

          expirationList.push({
            id: `v-${v.id}`,
            type: 'CRLV',
            title: `${v.brand ? v.brand + ' ' : ''}${v.model}`,
            identifier: v.plate,
            categoryOrModel: `Ano ${v.year} • ${v.currentKm} km`,
            expirationDate: expDate,
            daysRemaining: diffDays,
            status,
            targetUrl: '/veiculos'
          });
        }
      }

      // CNH de motoristas
      for (const d of drivers) {
        const cnhExp = d.cnh?.expirationDate || d.cnhExpiration || d.cnhExpirationDate;
        if (cnhExp) {
          const expDate = new Date(cnhExp);
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let status: 'EXPIRED' | 'EXPIRING_SOON' | 'REGULAR' = 'REGULAR';
          if (diffDays < 0) status = 'EXPIRED';
          else if (diffDays <= 30) status = 'EXPIRING_SOON';

          expirationList.push({
            id: `d-${d.id}`,
            type: 'CNH',
            title: d.name,
            identifier: d.cnh?.number || d.cnhNumber || d.cpf,
            categoryOrModel: `Categoria ${d.cnh?.category || d.cnhCategory || 'D'} • CPF ${d.cpf}`,
            expirationDate: expDate,
            daysRemaining: diffDays,
            status,
            targetUrl: '/motoristas'
          });
        }
      }

      // Ordena por prioridade: mais urgentes primeiro
      expirationList.sort((a, b) => a.daysRemaining - b.daysRemaining);

      this.items.set(expirationList);
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
      this.toastService.error('Erro ao carregar painel de expirações.');
    });
  }

  setTypeFilter(type: 'ALL' | 'CNH' | 'CRLV'): void {
    this.selectedTypeFilter.set(type);
    this.currentPage.set(1);
  }

  setStatusFilter(status: 'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'REGULAR'): void {
    this.selectedStatusFilter.set(status);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.selectedTypeFilter.set('ALL');
    this.selectedStatusFilter.set('ALL');
    this.currentPage.set(1);
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

  navigateTo(url: string): void {
    this.router.navigateByUrl(url);
  }
}
