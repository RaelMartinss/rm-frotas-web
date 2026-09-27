import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
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
  DriverSuspension,
  SuspensionReasonCategory,
  formatSuspensionReason,
} from '../../domain/models/driver.model';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import {
  DriverFormModalComponent,
  DriverFormPayload
} from './components/driver-form-modal/driver-form-modal.component';
import { DriverStatusModalComponent } from './components/driver-status-modal/driver-status-modal.component';
import {
  DriverSuspendModalComponent,
  SuspendFormSubmitPayload
} from './components/driver-suspend-modal/driver-suspend-modal.component';
import { DriverLiftSuspensionModalComponent } from './components/driver-lift-suspension-modal/driver-lift-suspension-modal.component';
import {
  DriverUpdateCnhModalComponent,
  UpdateCnhSubmitPayload
} from './components/driver-update-cnh-modal/driver-update-cnh-modal.component';
import { DriverDetailsModalComponent } from './components/driver-details-modal/driver-details-modal.component';
import { DriverResetPasswordModalComponent } from './components/driver-reset-password-modal/driver-reset-password-modal.component';
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
    DriverStatusModalComponent,
    DriverSuspendModalComponent,
    DriverLiftSuspensionModalComponent,
    DriverUpdateCnhModalComponent,
    DriverDetailsModalComponent,
    DriverResetPasswordModalComponent,
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

  // Modais de Criação e Ações
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal de Exibição de Senha Temporária
  tempPasswordModalOpen = signal<boolean>(false);
  tempPasswordData = signal<TempPasswordModalData | null>(null);
  copied = signal<boolean>(false);

  // Modal de Confirmação de Reset de Senha
  resetConfirmModalOpen = signal<boolean>(false);
  driverToReset = signal<Driver | null>(null);
  isResetting = signal<boolean>(false);

  selectedDriver = signal<Driver | null>(null);
  isUpdateCnhModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);

  // Modal de Suspensão Dedicado
  isSuspendModalOpen = signal<boolean>(false);
  isLiftModalOpen = signal<boolean>(false);
  suspensionErrorMessage = signal<string | null>(null);
  suspensionHistory = signal<DriverSuspension[]>([]);
  loadingSuspensions = signal<boolean>(false);

  // Modal Genérico de Status (Ativar / Desativar)
  isStatusConfirmModalOpen = signal<boolean>(false);
  pendingStatusAction = signal<'activate' | 'deactivate' | null>(null);

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  // Dropdown de Ações por Linha
  activeDropdownDriverId = signal<string | null>(null);

  toggleDropdown(id: string): void {
    this.activeDropdownDriverId.update((curr) => (curr === id ? null : id));
  }

  closeDropdown(): void {
    this.activeDropdownDriverId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }

  cnhCategories: CnhCategory[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

  suspensionReasonOptions: { value: SuspensionReasonCategory; label: string }[] = [
    { value: 'CNH_VENCIDA', label: 'CNH Vencida' },
    { value: 'ACIDENTE', label: 'Envolvimento em Acidente' },
    { value: 'PROCESSO_DISCIPLINAR', label: 'Processo Disciplinar' },
    { value: 'EXAME_TOXICOLOGICO_PENDENTE', label: 'Exame Toxicológico Pendente' },
    { value: 'DOCUMENTACAO_IRREGULAR', label: 'Documentação Irregular' },
    { value: 'OUTRO', label: 'Outro Motivo' },
  ];

  // Helpers exportados para o template
  readonly formatSuspensionReason = formatSuspensionReason;

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

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
    this.loadDrivers();
    this.loadStatusCounts();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadDrivers();
  }

  setPageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadDrivers();
        this.loadStatusCounts();
      });

    this.loadDrivers();
    this.loadStatusCounts();
  }

  loadDrivers(): void {
    this.loading.set(true);
    this.driverRepository
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchControl.value,
        status: this.selectedStatus(),
      })
      .subscribe({
        next: (response) => {
          this.drivers.set(response.data || []);
          this.totalItems.set(response.total || 0);
          this.totalPages.set(response.totalPages || 1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Erro ao carregar lista de motoristas.');
        }
      });
  }

  loadStatusCounts(): void {
    const term = this.searchControl.value?.trim();
    this.driverRepository
      .getAll({
        page: 1,
        limit: 100,
        search: term,
      })
      .subscribe({
        next: (response) => {
          const list = response.data || [];
          const active = list.filter(
            (d) => d.status === 'ACTIVE' || d.status === 'DISPONIVEL'
          ).length;
          const inTrip = list.filter(
            (d) => d.status === 'EM_VIAGEM'
          ).length;
          const inactive = list.filter(
            (d) => d.status === 'INACTIVE' || d.status === 'FOLGA'
          ).length;
          const suspended = list.filter(
            (d) => d.status === 'SUSPENDED' || d.status === 'AFASTADO'
          ).length;

          this.statusCounts.set({
            all: response.total ?? list.length,
            active,
            inTrip,
            inactive,
            suspended,
          });
        },
        error: () => {}
      });
  }

  getCnhNumber(driver: Driver): string {
    return driver.cnh?.number || driver.cnhNumber || '-';
  }

  getCnhCategory(driver: Driver): string {
    return driver.cnh?.category || driver.cnhCategory || '-';
  }

  getCnhExpiration(driver: Driver): string {
    return driver.cnh?.expirationDate || driver.cnhExpiration || '';
  }

  getDaysUntilExpiration(expirationDateStr?: string): number | null {
    if (!expirationDateStr) return null;
    const expirationDate = new Date(expirationDateStr);
    if (isNaN(expirationDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isCnhExpired(expirationDateStr?: string): boolean {
    const days = this.getDaysUntilExpiration(expirationDateStr);
    return days !== null && days < 0;
  }

  isCnhExpiringSoon(expirationDateStr?: string): boolean {
    const days = this.getDaysUntilExpiration(expirationDateStr);
    return days !== null && days >= 0 && days <= 30;
  }

  getCnhDaysLabel(expirationDateStr?: string): string {
    const days = this.getDaysUntilExpiration(expirationDateStr);
    if (days === null) return '-';
    if (days < 0) return 'Vencida';
    if (days === 0) return 'Vence hoje';
    if (days === 1) return 'Vence amanhã';
    return `Vence em ${days} dias`;
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

  isActive(driver: Driver): boolean {
    return driver.status === 'ACTIVE' || driver.status === 'DISPONIVEL';
  }

  isInactive(driver: Driver): boolean {
    return driver.status === 'INACTIVE' || driver.status === 'FOLGA';
  }

  isSuspended(driver: Driver): boolean {
    return driver.status === 'SUSPENDED' || driver.status === 'AFASTADO';
  }

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

  // --- AÇÕES: RESETAR SENHA DO MOTORISTA ---
  openResetPasswordModal(driver: Driver): void {
    if (this.impersonationService.isReadOnly()) return;
    this.driverToReset.set(driver);
    this.resetConfirmModalOpen.set(true);
  }

  closeResetConfirmModal(): void {
    this.resetConfirmModalOpen.set(false);
    this.driverToReset.set(null);
  }

  confirmResetPassword(): void {
    const driver = this.driverToReset();
    if (!driver) return;

    this.isResetting.set(true);
    this.driverRepository.resetPassword(driver.id).subscribe({
      next: (res) => {
        this.isResetting.set(false);
        this.closeResetConfirmModal();
        this.tempPasswordData.set({
          userName: driver.name,
          temporaryPassword: res.temporaryPassword,
          title: 'Senha do Motorista Resetada com Sucesso',
        });
        this.tempPasswordModalOpen.set(true);
        this.toastService.success('Senha temporária gerada com sucesso.');
      },
      error: (err) => {
        this.isResetting.set(false);
        let reason = 'Erro ao resetar senha do motorista.';
        if (err.error?.message) {
          reason = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(reason);
      },
    });
  }

  copyTempPassword(): void {
    const pwd = this.tempPasswordData()?.temporaryPassword;
    if (pwd) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copied.set(true);
        this.toastService.success('Senha copiada!');
        setTimeout(() => this.copied.set(false), 3000);
      });
    }
  }

  closeTempPasswordModal(): void {
    this.tempPasswordModalOpen.set(false);
    this.tempPasswordData.set(null);
  }

  // --- AÇÕES: ATIVAR / DESATIVAR MOTORISTA ---
  openStatusConfirmModal(driver: Driver, action: 'activate' | 'deactivate'): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedDriver.set(driver);
    this.pendingStatusAction.set(action);
    this.actionError.set(null);
    this.isStatusConfirmModalOpen.set(true);
  }

  closeStatusConfirmModal(): void {
    this.isStatusConfirmModalOpen.set(false);
    this.selectedDriver.set(null);
    this.pendingStatusAction.set(null);
    this.actionError.set(null);
  }

  confirmStatusChange(): void {
    const driver = this.selectedDriver();
    const action = this.pendingStatusAction();
    if (!driver || !action) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    const request$ =
      action === 'activate'
        ? this.driverRepository.activate(driver.id)
        : this.driverRepository.deactivate(driver.id);

    const successMessage =
      action === 'activate'
        ? `Motorista ${driver.name} ativado com sucesso!`
        : `Motorista ${driver.name} desativado com sucesso.`;

    request$.subscribe({
      next: (updatedDriver) => {
        this.drivers.update((list) =>
          list.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
        );
        this.isActionLoading.set(false);
        this.toastService.success(successMessage);
        this.loadStatusCounts();
        this.closeStatusConfirmModal();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Erro ao alterar status do motorista.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: SUSPENSÃO DEDICADA ---
  openSuspendModal(driver: Driver): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedDriver.set(driver);
    this.suspensionErrorMessage.set(null);
    this.isSuspendModalOpen.set(true);
  }

  closeSuspendModal(): void {
    this.isSuspendModalOpen.set(false);
    this.suspensionErrorMessage.set(null);
  }

  confirmSuspendDriver(formValue: SuspendFormSubmitPayload): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    this.isActionLoading.set(true);
    this.suspensionErrorMessage.set(null);

    const payload = {
      reasonCategory: formValue.reasonCategory,
      reasonDetails: formValue.reasonDetails || undefined,
      expectedReturnDate: formValue.indefinite ? null : formValue.expectedReturnDate,
      indefinite: !!formValue.indefinite,
      attachmentUrl: formValue.attachmentUrl || undefined,
    };

    this.driverRepository.suspend(driver.id, payload).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Motorista ${driver.name} suspenso com sucesso.`);
        this.closeSuspendModal();
        this.loadDrivers();
        this.loadStatusCounts();
        if (this.isDetailsModalOpen()) {
          this.loadDriverSuspensions(driver.id);
        }
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg =
          err.error?.message ||
          'Não foi possível suspender o motorista. Verifique se ele possui viagem em andamento.';
        this.suspensionErrorMessage.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: ENCERRAMENTO DE SUSPENSÃO (REATIVAÇÃO) ---
  openLiftModal(driver: Driver): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedDriver.set(driver);
    this.actionError.set(null);
    this.isLiftModalOpen.set(true);
  }

  closeLiftModal(): void {
    this.isLiftModalOpen.set(false);
    this.actionError.set(null);
  }

  confirmLiftSuspension(data: { liftReason?: string }): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.driverRepository.liftSuspension(driver.id, {
      liftReason: data.liftReason || undefined,
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Suspensão de ${driver.name} encerrada com sucesso! Motorista reativado.`);
        this.closeLiftModal();
        this.loadDrivers();
        this.loadStatusCounts();
        if (this.isDetailsModalOpen()) {
          this.loadDriverSuspensions(driver.id);
        }
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Erro ao reativar motorista.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- HISTÓRICO DE SUSPENSÕES ---
  loadDriverSuspensions(driverId: string): void {
    this.loadingSuspensions.set(true);
    this.driverRepository.getDriverSuspensions(driverId, { page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.suspensionHistory.set(res.data || []);
        this.loadingSuspensions.set(false);
      },
      error: () => {
        this.loadingSuspensions.set(false);
      }
    });
  }

  // --- AÇÕES: ATUALIZAR / RENOVAR CNH ---
  openUpdateCnhModal(driver: Driver): void {
    if (this.impersonationService.isReadOnly()) return;
    this.selectedDriver.set(driver);
    this.actionError.set(null);
    this.isUpdateCnhModalOpen.set(true);
  }

  closeUpdateCnhModal(): void {
    this.isUpdateCnhModalOpen.set(false);
    this.selectedDriver.set(null);
    this.actionError.set(null);
  }

  confirmUpdateCnh(formValue: UpdateCnhSubmitPayload): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.driverRepository.updateCnh(driver.id, {
      cnhNumber: formValue.cnhNumber,
      cnhCategory: formValue.cnhCategory as CnhCategory,
      cnhExpirationDate: formValue.cnhExpirationDate
    }).subscribe({
      next: (updatedDriver) => {
        this.drivers.update((list) =>
          list.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
        );
        this.isActionLoading.set(false);
        this.toastService.success(`CNH de ${driver.name} atualizada com sucesso!`);
        this.loadStatusCounts();
        this.closeUpdateCnhModal();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Erro ao atualizar dados da CNH.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }

  // --- AÇÕES: DETALHES / FICHA DO MOTORISTA ---
  openDetailsModal(driver: Driver): void {
    this.selectedDriver.set(driver);
    this.isDetailsModalOpen.set(true);
    this.loadDriverSuspensions(driver.id);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedDriver.set(null);
    this.suspensionHistory.set([]);
  }
}
