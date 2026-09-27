import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import {
  Driver,
  CnhCategory,
} from '../../domain/models/driver.model';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import {
  DriverFormModalComponent,
  DriverFormPayload
} from './components/driver-form-modal/driver-form-modal.component';
import {
  DriverTempPasswordModalComponent,
  TempPasswordModalData
} from './components/driver-temp-password-modal/driver-temp-password-modal.component';
import {
  LucideUsers,
  LucidePlus,
  LucideSearch,
  LucideX,
  LucidePhone,
  LucideMail,
  LucideCalendar,
  LucidePencil,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    PaginationComponent,
    DriverFormModalComponent,
    DriverTempPasswordModalComponent,
    LucideUsers,
    LucidePlus,
    LucideSearch,
    LucideX,
    LucidePhone,
    LucideMail,
    LucideCalendar,
    LucidePencil,
  ],
  templateUrl: './driver-list.html',
  styleUrl: './driver-list.css'
})
export class DriverListComponent implements OnInit {
  private readonly driverRepository = inject(IDriverRepository);
  private readonly toastService = inject(ToastService);
  protected readonly impersonationService = inject(ImpersonationService);

  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(true);

  // --- PAGINAÇÃO SERVER-SIDE (OFFSET / LIMIT) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [10, 20, 50, 100];
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);

  // Modal de Criação de Novo Motorista
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal de Exibição de Senha Temporária
  tempPasswordModalOpen = signal<boolean>(false);
  tempPasswordData = signal<TempPasswordModalData | null>(null);

  cnhCategories: CnhCategory[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

  // --- FILTROS E BUSCA REATIVA COM SERVER-SIDE QUERY ---
  searchControl = new FormControl('', { nonNullable: true });
  selectedStatus = signal<string>('ALL');

  // Contadores por Status para os Chips
  statusCounts = signal<{
    all: number;
    active: number;
    inTrip: number;
    inactive: number;
    suspended: number;
  }>({
    all: 0,
    active: 0,
    inTrip: 0,
    inactive: 0,
    suspended: 0,
  });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  ngOnInit(): void {
    this.loadDrivers();
    this.loadStatusCounts();

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadDrivers();
      });
  }

  loadDrivers(): void {
    this.loading.set(true);

    this.driverRepository
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchControl.value.trim(),
        status: this.selectedStatus(),
      })
      .subscribe({
        next: (response) => {
          this.drivers.set(response.data);
          this.totalItems.set(response.total);
          this.totalPages.set(response.totalPages);
          this.currentPage.set(response.page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Erro ao carregar lista de motoristas.');
        },
      });
  }

  loadStatusCounts(): void {
    this.driverRepository.getAll({ limit: 1000 }).subscribe({
      next: (res) => {
        const all = res.data;
        this.statusCounts.set({
          all: res.total,
          active: all.filter((d) => d.status === 'ACTIVE' || d.status === 'DISPONIVEL').length,
          inTrip: all.filter((d) => d.status === 'EM_VIAGEM').length,
          inactive: all.filter((d) => d.status === 'INACTIVE' || d.status === 'FOLGA').length,
          suspended: all.filter((d) => d.status === 'SUSPENDED' || d.status === 'AFASTADO').length,
        });
      },
      error: () => {},
    });
  }

  setStatusFilter(status: string): void {
    if (this.selectedStatus() === status) return;
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.loadDrivers();
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  // --- HELPERS DE FORMATAÇÃO E CNH ---
  getCnhNumber(driver: Driver): string {
    return driver.cnh?.number || driver.cnhNumber || '-';
  }

  getCnhCategory(driver: Driver): string {
    return driver.cnh?.category || driver.cnhCategory || '-';
  }

  getCnhExpiration(driver: Driver): string | null {
    return driver.cnh?.expirationDate || driver.cnhExpiration || null;
  }

  isCnhExpired(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate < today;
  }

  isCnhExpiringSoon(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  getCnhDaysLabel(dateStr: string | null): string {
    if (!dateStr) return '';
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Vence amanhã';
    return `Vence em ${diffDays} dias`;
  }

  getDriverStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'Ativo';
      case 'INACTIVE':
      case 'FOLGA':
        return 'Inativo';
      case 'SUSPENDED':
      case 'AFASTADO':
        return 'Suspenso';
      case 'EM_VIAGEM':
        return 'Em viagem';
      default:
        return status || 'Ativo';
    }
  }

  getDriverStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'EM_VIAGEM':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
    }
  }

  getDriverStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-500';
      case 'EM_VIAGEM':
        return 'bg-blue-500';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-slate-500';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-500';
    }
  }

  // --- NOVO MOTORISTA ---
  openModal(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set(null);
  }

  saveDriver(formValue: DriverFormPayload): void {
    this.errorMessage.set(null);
    this.isSaving.set(true);

    const payload = {
      name: formValue.name,
      email: (formValue.email || '').trim().toLowerCase(),
      cpf: formValue.cpf.replace(/\D/g, ''),
      cnhNumber: formValue.cnhNumber,
      cnhCategory: formValue.cnhCategory,
      cnhExpirationDate: formValue.cnhExpiration,
      phone: formValue.phone,
    };

    this.driverRepository.create(payload as any).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.closeModal();
        this.toastService.success('Motorista cadastrado com sucesso!');
        this.currentPage.set(1);
        this.loadDrivers();
        this.loadStatusCounts();

        if (response.temporaryPassword) {
          this.tempPasswordData.set({
            userName: response.name || formValue.name,
            temporaryPassword: response.temporaryPassword,
            title: 'Motorista Cadastrado com Sucesso',
          });
          this.tempPasswordModalOpen.set(true);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        let msg = 'Erro ao cadastrar motorista. Verifique os dados informados.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.errorMessage.set(msg);
        this.toastService.error(`Motorista não cadastrado: ${msg}`);
      }
    });
  }

  closeTempPasswordModal(): void {
    this.tempPasswordModalOpen.set(false);
    this.tempPasswordData.set(null);
  }
}
