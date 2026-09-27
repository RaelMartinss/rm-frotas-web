import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IDriverRepository } from '../../../domain/repositories/driver.repository.interface';
import { ITripRepository } from '../../../domain/repositories/trip.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import { ImpersonationService } from '../../../core/services/impersonation.service';
import {
  Driver,
  CnhCategory,
  DriverStatus,
  DriverSuspension,
  SuspensionReasonCategory,
  formatSuspensionReason,
} from '../../../domain/models/driver.model';
import { Trip } from '../../../domain/models/trip.model';
import {
  LucideArrowLeft,
  LucideSave,
  LucideUser,
  LucideIdCard,
  LucidePhone,
  LucideMail,
  LucideCalendar,
  LucideCar,
  LucideFuel,
  LucideKeyRound,
  LucideBan,
  LucideUserCheck,
  LucidePauseCircle,
  LucidePlay,
  LucideAlertTriangle,
  LucideLoader2,
  LucideShieldCheck,
  LucideShieldAlert,
  LucideBriefcase,
  LucideMapPin,
  LucideChevronDown,
  LucideCopy,
  LucideCheck,
  LucideCamera,
  LucideTrash2,
} from '@lucide/angular';
import { compressImage } from '../../../core/utils/image-compressor';
import {
  PhoneMaskDirective,
  CnhMaskDirective,
} from '../../shared/directives/input-mask.directives';

@Component({
  selector: 'app-driver-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    PhoneMaskDirective,
    CnhMaskDirective,
    LucideArrowLeft,
    LucideSave,
    LucideUser,
    LucideIdCard,
    LucidePhone,
    LucideMail,
    LucideCalendar,
    LucideCar,
    LucideFuel,
    LucideKeyRound,
    LucideBan,
    LucideUserCheck,
    LucidePauseCircle,
    LucidePlay,
    LucideAlertTriangle,
    LucideLoader2,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideBriefcase,
    LucideMapPin,
    LucideChevronDown,
    LucideCopy,
    LucideCheck,
    LucideCamera,
    LucideTrash2,
  ],
  templateUrl: './driver-edit.html',
})
export class DriverEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly driverRepository = inject(IDriverRepository);
  private readonly tripRepository = inject(ITripRepository);
  private readonly toastService = inject(ToastService);
  protected readonly impersonationService = inject(ImpersonationService);

  driverId = signal<string>('');
  driver = signal<Driver | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  activeTrip = signal<Trip | null>(null);
  activeSuspension = signal<DriverSuspension | null>(null);
  photoPreview = signal<string | null>(null);

  // Accordion state: which action is currently expanded
  expandedAction = signal<'reset-password' | 'status' | 'suspend' | 'lift' | null>(null);

  // Inline Quick Action: Reset Password
  isResetting = signal(false);
  tempPassword = signal<string | null>(null);
  passwordCopied = signal(false);
  resetError = signal<string | null>(null);

  // Inline Quick Action: Status (Ativar / Desativar)
  isStatusLoading = signal(false);
  actionError = signal<string | null>(null);

  // Inline Quick Action: Suspender Motorista
  isSuspending = signal(false);
  suspendError = signal<string | null>(null);
  suspendReasons: { value: SuspensionReasonCategory; label: string }[] = [
    { value: 'CNH_VENCIDA', label: 'CNH Vencida' },
    { value: 'ACIDENTE', label: 'Envolvimento em Acidente' },
    { value: 'PROCESSO_DISCIPLINAR', label: 'Processo Disciplinar' },
    { value: 'EXAME_TOXICOLOGICO_PENDENTE', label: 'Exame Toxicológico Pendente' },
    { value: 'DOCUMENTACAO_IRREGULAR', label: 'Documentação Irregular' },
    { value: 'OUTRO', label: 'Outro Motivo' },
  ];

  suspendForm: FormGroup = this.fb.group({
    reasonCategory: ['PROCESSO_DISCIPLINAR' as SuspensionReasonCategory, Validators.required],
    reasonDetails: [''],
    indefinite: [false],
    expectedReturnDate: [''],
  });

  // Inline Quick Action: Encerrar Suspensão
  isLifting = signal(false);
  liftError = signal<string | null>(null);
  liftForm: FormGroup = this.fb.group({
    liftReason: [''],
  });

  cnhCategories: CnhCategory[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    cpf: [{ value: '', disabled: true }],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    birthDate: [''],
    role: ['Motorista'],
    address: [''],
    cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    cnhCategory: ['B' as CnhCategory, [Validators.required]],
    cnhExpirationDate: ['', [Validators.required]],
    isActive: [true],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastService.error('ID do motorista não informado.');
      this.router.navigate(['/motoristas']);
      return;
    }
    this.driverId.set(id);
    this.loadDriverData(id);

    this.suspendForm.get('indefinite')?.valueChanges.subscribe((indefinite) => {
      const returnControl = this.suspendForm.get('expectedReturnDate');
      if (indefinite) {
        returnControl?.clearValidators();
      } else {
        returnControl?.setValidators(Validators.required);
      }
      returnControl?.updateValueAndValidity();
    });
  }

  loadDriverData(id: string): void {
    this.loading.set(true);
    this.driverRepository.getById(id).subscribe({
      next: (driver) => {
        this.driver.set(driver);
        this.populateForm(driver);
        this.loading.set(false);
        this.checkActiveTrip(id);
        if (driver.status === 'SUSPENDED' || driver.status === 'AFASTADO') {
          this.loadActiveSuspension(id);
        } else {
          this.activeSuspension.set(null);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Erro ao carregar dados do motorista.');
        this.router.navigate(['/motoristas']);
      },
    });
  }

  private populateForm(driver: Driver): void {
    const cnhExp = this.formatDateForInput(
      driver.cnh?.expirationDate || driver.cnhExpiration
    );

    this.form.patchValue({
      name: driver.name,
      cpf: driver.cpf,
      phone: this.formatPhone(driver.phone || ''),
      email: driver.email || '',
      cnhNumber: driver.cnh?.number || driver.cnhNumber || '',
      cnhCategory: driver.cnh?.category || driver.cnhCategory || 'B',
      cnhExpirationDate: cnhExp,
      isActive: driver.status !== 'INACTIVE' && driver.status !== 'FOLGA',
      role: 'Motorista',
    });
    this.photoPreview.set(driver.photoUrl || null);
  }

  formatPhone(value?: string | null): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    } else if (digits.length > 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      return `(${digits}`;
    }
    return value;
  }

  private formatDateForInput(dateVal?: string | Date): string {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  private checkActiveTrip(driverId: string): void {
    this.tripRepository.getAll({ limit: 100 }).subscribe({
      next: (res) => {
        const found = res.data.find(
          (t) =>
            t.driverId === driverId &&
            (t.status === 'IN_PROGRESS' || t.status === 'EM_ANDAMENTO')
        );
        if (found) {
          this.activeTrip.set(found);
        }
      },
      error: () => {},
    });
  }

  private loadActiveSuspension(driverId: string): void {
    this.driverRepository.getActiveSuspension(driverId).subscribe({
      next: (susp) => {
        this.activeSuspension.set(susp);
      },
      error: () => {},
    });
  }

  get initials(): string {
    const name = this.driver()?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get cnhStatus(): { label: string; class: string; dotClass: string; isExpired: boolean; isSoon: boolean } {
    const expDateStr = this.form.get('cnhExpirationDate')?.value;
    if (!expDateStr) {
      return { label: 'Não informada', class: 'bg-slate-100 text-slate-600 border-slate-200', dotClass: 'bg-slate-400', isExpired: false, isSoon: false };
    }
    const exp = new Date(expDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (exp < today) {
      return { label: 'CNH VENCIDA', class: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500', isExpired: true, isSoon: false };
    }

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return {
        label: `VENCE EM ${diffDays} DIAS`,
        class: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotClass: 'bg-amber-500',
        isExpired: false,
        isSoon: true,
      };
    }

    return { label: 'CNH VÁLIDA', class: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dotClass: 'bg-emerald-500', isExpired: false, isSoon: false };
  }

  get driverStatusLabel(): string {
    const s = this.driver()?.status;
    switch (s) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'Ativo';
      case 'EM_VIAGEM':
        return 'Em Viagem';
      case 'INACTIVE':
      case 'FOLGA':
        return 'Inativo';
      case 'SUSPENDED':
      case 'AFASTADO':
        return 'Suspenso';
      default:
        return s || 'Ativo';
    }
  }

  get driverStatusClass(): string {
    const s = this.driver()?.status;
    switch (s) {
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
        return 'bg-rose-50 text-rose-700 border-rose-200/70';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    }
  }

  get driverStatusDotClass(): string {
    const s = this.driver()?.status;
    switch (s) {
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
        return 'bg-rose-500';
      default:
        return 'bg-emerald-500';
    }
  }

  isSuspended(): boolean {
    const s = this.driver()?.status;
    return s === 'SUSPENDED' || s === 'AFASTADO';
  }

  isActive(): boolean {
    const s = this.driver()?.status;
    return s === 'ACTIVE' || s === 'DISPONIVEL';
  }

  async onPhotoSelected(event: Event): Promise<void> {
    if (this.impersonationService.isReadOnly()) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      const compressed = await compressImage(file, 600, 600, 0.8);
      this.photoPreview.set(compressed);
      this.form.markAsDirty();
      this.toastService.info('Foto selecionada. Clique em "Salvar alterações" para confirmar.');
    } catch (err: any) {
      this.toastService.error(err.message || 'Erro ao processar imagem.');
    } finally {
      input.value = '';
    }
  }

  removePhoto(): void {
    if (this.impersonationService.isReadOnly()) return;
    this.photoPreview.set(null);
    this.form.markAsDirty();
    this.toastService.info('Foto removida. Clique em "Salvar alterações" para confirmar.');
  }

  save(): void {
    if (this.impersonationService.isReadOnly()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    const formVal = this.form.getRawValue();
    this.saving.set(true);

    const updatePayload = {
      name: formVal.name.trim(),
      email: formVal.email ? formVal.email.trim().toLowerCase() : undefined,
      phone: formVal.phone ? formVal.phone.trim() : undefined,
      photoUrl: this.photoPreview(),
      cnhNumber: formVal.cnhNumber.trim(),
      cnhCategory: formVal.cnhCategory,
      cnhExpirationDate: formVal.cnhExpirationDate,
      status: (formVal.isActive ? 'ACTIVE' : 'INACTIVE') as DriverStatus,
    };

    this.driverRepository.update(this.driverId(), updatePayload as any).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.driver.set(updated);
        this.populateForm(updated);
        this.toastService.success('Dados do motorista atualizados com sucesso!');
      },
      error: (err) => {
        this.saving.set(false);
        let msg = 'Erro ao atualizar dados do motorista.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.toastService.error(msg);
      },
    });
  }

  // --- ACCORDION LOGIC ---
  toggleAction(action: 'reset-password' | 'status' | 'suspend' | 'lift'): void {
    if (this.impersonationService.isReadOnly()) return;
    if (this.expandedAction() === action) {
      this.expandedAction.set(null);
    } else {
      this.expandedAction.set(action);
      this.actionError.set(null);
      this.resetError.set(null);
      this.suspendError.set(null);
      this.liftError.set(null);
    }
  }

  // --- INLINE: RESET PASSWORD ---
  executeResetPassword(): void {
    const d = this.driver();
    if (!d) return;

    this.isResetting.set(true);
    this.resetError.set(null);

    this.driverRepository.resetPassword(d.id).subscribe({
      next: (res) => {
        this.isResetting.set(false);
        this.tempPassword.set(res.temporaryPassword);
        this.toastService.success('Nova senha provisória gerada com sucesso.');
      },
      error: (err) => {
        this.isResetting.set(false);
        let msg = 'Erro ao resetar senha do motorista.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.resetError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  copyPassword(): void {
    const pwd = this.tempPassword();
    if (pwd && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.passwordCopied.set(true);
        this.toastService.success('Senha copiada para a área de transferência!');
        setTimeout(() => this.passwordCopied.set(false), 2500);
      });
    }
  }

  // --- INLINE: STATUS CHANGE (ATIVAR / DESATIVAR) ---
  executeStatusChange(action: 'activate' | 'deactivate'): void {
    const d = this.driver();
    if (!d) return;

    this.isStatusLoading.set(true);
    this.actionError.set(null);

    const req$ =
      action === 'activate'
        ? this.driverRepository.activate(d.id)
        : this.driverRepository.deactivate(d.id);

    req$.subscribe({
      next: (updated) => {
        this.isStatusLoading.set(false);
        this.driver.set(updated);
        this.form.patchValue({
          isActive: updated.status !== 'INACTIVE' && updated.status !== 'FOLGA',
        });
        this.expandedAction.set(null);
        this.toastService.success(
          action === 'activate' ? 'Motorista ativado com sucesso!' : 'Motorista desativado com sucesso.'
        );
      },
      error: (err) => {
        this.isStatusLoading.set(false);
        let msg = 'Erro ao alterar status do motorista.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.actionError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  // --- INLINE: SUSPEND ---
  executeSuspend(): void {
    const d = this.driver();
    if (!d) return;

    if (this.suspendForm.invalid) {
      this.suspendForm.markAllAsTouched();
      return;
    }

    this.isSuspending.set(true);
    this.suspendError.set(null);

    const formVal = this.suspendForm.value;

    this.driverRepository.suspend(d.id, {
      reasonCategory: formVal.reasonCategory,
      reasonDetails: formVal.reasonDetails || undefined,
      indefinite: formVal.indefinite,
      expectedReturnDate: formVal.indefinite ? undefined : formVal.expectedReturnDate,
    }).subscribe({
      next: () => {
        this.isSuspending.set(false);
        this.expandedAction.set(null);
        this.toastService.success(`Motorista ${d.name} suspenso com sucesso.`);
        this.loadDriverData(d.id);
      },
      error: (err) => {
        this.isSuspending.set(false);
        let msg = 'Erro ao suspender motorista.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.suspendError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  // --- INLINE: LIFT SUSPENSION ---
  executeLift(): void {
    const d = this.driver();
    if (!d) return;

    this.isLifting.set(true);
    this.liftError.set(null);

    const liftReason = this.liftForm.value.liftReason?.trim() || undefined;

    this.driverRepository.liftSuspension(d.id, { liftReason }).subscribe({
      next: () => {
        this.isLifting.set(false);
        this.expandedAction.set(null);
        this.toastService.success(`Suspensão encerrada e motorista ${d.name} reativado!`);
        this.loadDriverData(d.id);
      },
      error: (err) => {
        this.isLifting.set(false);
        let msg = 'Erro ao reativar motorista.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        this.liftError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  formatReason(reason?: string | null): string {
    return formatSuspensionReason(reason);
  }
}
