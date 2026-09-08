import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IDriverRepository } from '../../domain/repositories/driver.repository.interface';
import { ToastService } from '../../core/services/toast.service';
import {
  Driver,
  CnhCategory,
  DriverSuspension,
  SuspensionReasonCategory,
  SUSPENSION_REASON_LABELS,
  formatSuspensionReason,
} from '../../domain/models/driver.model';
import { CpfMaskDirective, PhoneMaskDirective, CnhMaskDirective } from '../shared/directives/input-mask.directives';
import {
  LucideUsers,
  LucidePlus,
  LucideSearch,
  LucideLoader2,
  LucideX,
  LucideAlertTriangle,
  LucidePhone,
  LucideIdCard,
  LucideEye,
  LucideAlertCircle,
  LucideCheck,
  LucideBan,
  LucidePauseCircle,
  LucidePlay,
  LucideUserCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideFuel,
  LucideExternalLink,
  LucideFileText,
  LucideHistory,
  LucideKeyRound,
  LucideCopy,
  LucideMail,
  LucideShieldCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CpfMaskDirective,
    PhoneMaskDirective,
    CnhMaskDirective,
    LucideUsers,
    LucidePlus,
    LucideSearch,
    LucideLoader2,
    LucideX,
    LucideAlertTriangle,
    LucidePhone,
    LucideIdCard,
    LucideEye,
    LucideAlertCircle,
    LucideCheck,
    LucideBan,
    LucidePauseCircle,
    LucidePlay,
    LucideUserCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideFuel,
    LucideExternalLink,
    LucideFileText,
    LucideHistory,
    LucideKeyRound,
    LucideCopy,
    LucideMail,
    LucideShieldCheck,
  ],
  templateUrl: './driver-list.html',
  styleUrl: './driver-list.css'
})
export class DriverListComponent implements OnInit {
  private readonly driverRepository = inject(IDriverRepository);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(true);

  // --- PAGINAÇÃO SERVER-SIDE (OFFSET / LIMIT) ---
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  pageSizeOptions: number[] = [10, 25, 50];

  // Modais de Criação e Ações
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal de Exibição de Senha Temporária
  tempPasswordModalOpen = signal<boolean>(false);
  tempPasswordData = signal<{
    userName: string;
    temporaryPassword: string;
    title?: string;
  } | null>(null);
  copied = signal<boolean>(false);

  // Modal de Confirmação de Reset de Senha
  resetConfirmModalOpen = signal<boolean>(false);
  driverToReset = signal<Driver | null>(null);
  isResetting = signal<boolean>(false);

  selectedDriver = signal<Driver | null>(null);
  isUpdateCnhModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  detailsTab = signal<'info' | 'suspensions'>('info');

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

  searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
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

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentPage.set(1);
    this.loadDrivers();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadDrivers();
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
    this.loadDrivers();
  }

  // --- FORMULÁRIOS REATIVOS ---
  driverForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)]],
    phone: [''],
    cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    cnhCategory: ['D', [Validators.required]],
    cnhExpiration: ['', [Validators.required]]
  });

  updateCnhForm: FormGroup = this.fb.group({
    cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    cnhCategory: ['D', [Validators.required]],
    cnhExpirationDate: ['', [Validators.required]]
  });

  suspendForm: FormGroup = this.fb.group({
    reasonCategory: ['CNH_VENCIDA' as SuspensionReasonCategory, [Validators.required]],
    reasonDetails: [''],
    indefinite: [false],
    expectedReturnDate: [''],
    attachmentUrl: ['']
  });

  liftForm: FormGroup = this.fb.group({
    liftReason: ['']
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadDrivers();
      });

    this.loadDrivers();
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

  openModal(): void {
    this.errorMessage.set(null);
    this.driverForm.reset({ cnhCategory: 'D' });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set(null);
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

  isCnhExpired(expirationDateStr?: string): boolean {
    if (!expirationDateStr) return false;
    const expirationDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expirationDate < today;
  }

  isCnhExpiringSoon(expirationDateStr?: string): boolean {
    if (!expirationDateStr) return false;
    const expirationDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
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

  saveDriver(): void {
    this.errorMessage.set(null);

    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.driverForm.value;

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
    this.selectedDriver.set(driver);
    this.suspensionErrorMessage.set(null);
    this.suspendForm.reset({
      reasonCategory: 'CNH_VENCIDA',
      reasonDetails: '',
      indefinite: false,
      expectedReturnDate: '',
      attachmentUrl: ''
    });
    this.isSuspendModalOpen.set(true);
  }

  closeSuspendModal(): void {
    this.isSuspendModalOpen.set(false);
    this.suspensionErrorMessage.set(null);
  }

  confirmSuspendDriver(): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    const formValue = this.suspendForm.value;

    if (formValue.reasonCategory === 'OUTRO' && (!formValue.reasonDetails || formValue.reasonDetails.trim().length === 0)) {
      this.suspensionErrorMessage.set('Para o motivo "Outro", é obrigatório fornecer os detalhes da justificativa.');
      return;
    }

    if (!formValue.indefinite && !formValue.expectedReturnDate) {
      this.suspensionErrorMessage.set('Informe a data prevista de retorno ou marque a opção "Sem prazo definido".');
      return;
    }

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
    this.selectedDriver.set(driver);
    this.liftForm.reset({ liftReason: '' });
    this.actionError.set(null);
    this.isLiftModalOpen.set(true);
  }

  closeLiftModal(): void {
    this.isLiftModalOpen.set(false);
    this.actionError.set(null);
  }

  confirmLiftSuspension(): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    const formValue = this.liftForm.value;

    this.driverRepository.liftSuspension(driver.id, {
      liftReason: formValue.liftReason || undefined,
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Suspensão de ${driver.name} encerrada com sucesso! Motorista reativado.`);
        this.closeLiftModal();
        this.loadDrivers();
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

  setDetailsTab(tab: 'info' | 'suspensions'): void {
    this.detailsTab.set(tab);
    if (tab === 'suspensions' && this.selectedDriver()) {
      this.loadDriverSuspensions(this.selectedDriver()!.id);
    }
  }

  // --- AÇÕES: ATUALIZAR / RENOVAR CNH ---
  openUpdateCnhModal(driver: Driver): void {
    this.selectedDriver.set(driver);
    this.actionError.set(null);

    const currentExp = this.getCnhExpiration(driver);
    const dateFormatted = currentExp ? currentExp.split('T')[0] : '';

    this.updateCnhForm.reset({
      cnhNumber: this.getCnhNumber(driver) === '-' ? '' : this.getCnhNumber(driver),
      cnhCategory: this.getCnhCategory(driver) === '-' ? 'D' : this.getCnhCategory(driver),
      cnhExpirationDate: dateFormatted
    });

    this.isUpdateCnhModalOpen.set(true);
  }

  closeUpdateCnhModal(): void {
    this.isUpdateCnhModalOpen.set(false);
    this.selectedDriver.set(null);
    this.actionError.set(null);
  }

  confirmUpdateCnh(): void {
    const driver = this.selectedDriver();
    if (!driver) return;

    if (this.updateCnhForm.invalid) {
      this.updateCnhForm.markAllAsTouched();
      this.toastService.error('Preencha os dados da CNH corretamente.');
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);

    const formValue = this.updateCnhForm.value;

    this.driverRepository.updateCnh(driver.id, {
      cnhNumber: formValue.cnhNumber,
      cnhCategory: formValue.cnhCategory,
      cnhExpirationDate: formValue.cnhExpirationDate
    }).subscribe({
      next: (updatedDriver) => {
        this.drivers.update((list) =>
          list.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
        );
        this.isActionLoading.set(false);
        this.toastService.success(`CNH de ${driver.name} atualizada com sucesso!`);
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
    this.detailsTab.set('info');
    this.isDetailsModalOpen.set(true);
    this.loadDriverSuspensions(driver.id);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedDriver.set(null);
    this.suspensionHistory.set([]);
  }
}
