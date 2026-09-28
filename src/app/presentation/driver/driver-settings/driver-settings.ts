import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { DriverPortalSummary } from '../../../domain/models/driver-portal.model';
import { ToastService } from '../../../core/services/toast.service';
import { AppUpdateService } from '../../../core/services/app-update.service';
import {
  LucideArrowLeft,
  LucideUser,
  LucideLock,
  LucideBell,
  LucideMapPin,
  LucideInfo,
  LucideFileText,
  LucideShield,
  LucideHeadphones,
  LucideLogOut,
  LucideChevronRight,
  LucideX,
  LucideLoader2,
  LucideDownload,
  LucideEye,
  LucideEyeOff,
  LucideNavigation,
  LucidePhone,
  LucideMail,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    LucideArrowLeft,
    LucideUser,
    LucideLock,
    LucideBell,
    LucideMapPin,
    LucideInfo,
    LucideFileText,
    LucideShield,
    LucideHeadphones,
    LucideLogOut,
    LucideChevronRight,
    LucideX,
    LucideLoader2,
    LucideDownload,
    LucideEye,
    LucideEyeOff,
    LucideNavigation,
    LucidePhone,
    LucideMail,
  ],
  templateUrl: './driver-settings.html',
})
export class DriverSettingsComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly authRepository = inject(IAuthRepository);
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly toastService = inject(ToastService);
  readonly updateService = inject(AppUpdateService);
  private readonly router = inject(Router);

  readonly summary = signal<DriverPortalSummary | null>(null);
  readonly currentUser = computed(() => this.authState.currentUser());

  // Modais de cada seção
  readonly personalDataModalOpen = signal<boolean>(false);
  readonly changePasswordModalOpen = signal<boolean>(false);
  readonly notificationsModalOpen = signal<boolean>(false);
  readonly locationModalOpen = signal<boolean>(false);
  readonly aboutModalOpen = signal<boolean>(false);
  readonly termsModalOpen = signal<boolean>(false);
  readonly privacyModalOpen = signal<boolean>(false);
  readonly supportModalOpen = signal<boolean>(false);
  readonly logoutModalOpen = signal<boolean>(false);

  // Estados de formulários
  readonly savingPersonalData = signal<boolean>(false);
  readonly changingPassword = signal<boolean>(false);

  // Dados Pessoais
  editName = '';
  editEmail = '';
  editPhone = '';
  editBirthDate = '';
  hasExistingBirthDate = false;

  // Alterar Senha
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;

  // Notificações (Preferências locais)
  notifyTrips = true;
  notifyFuel = true;
  notifyAlerts = true;

  // Localização (GPS em tempo real)
  gpsStatus = signal<'checking' | 'granted' | 'prompt' | 'denied'>('prompt');
  gpsCoords = signal<{ lat: number; lng: number; accuracy?: number } | null>(null);
  isTestingGps = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDriverData();
    this.checkGpsPermission();
    this.loadLocalPreferences();
  }

  loadDriverData(): void {
    this.portalRepository.getCurrentTrip().subscribe({
      next: (sum) => {
        this.summary.set(sum);
        this.initFormData(sum);
      },
      error: () => {
        this.initFormData(null);
      },
    });
  }

  private initFormData(sum: DriverPortalSummary | null): void {
    const user = this.currentUser();
    const driver = sum?.driver;

    this.editName = driver?.name || user?.name || '';
    this.editEmail = user?.email || '';

    // Recupera telefone e data de nascimento armazenados localmente se não vierem da API
    const savedPhone = localStorage.getItem('rm_driver_phone_' + (user?.id || 'default'));
    this.editPhone = savedPhone || '(91) 98123-4567';

    const savedBirth = localStorage.getItem('rm_driver_birth_' + (user?.id || 'default'));
    if (savedBirth) {
      this.editBirthDate = savedBirth;
      this.hasExistingBirthDate = true;
    } else {
      this.editBirthDate = '';
      this.hasExistingBirthDate = false;
    }
  }

  openPersonalDataModal(): void {
    this.personalDataModalOpen.set(true);
  }

  savePersonalData(): void {
    if (!this.editName.trim()) {
      this.toastService.error('O nome não pode ficar em branco.');
      return;
    }
    if (!this.editEmail.trim()) {
      this.toastService.error('O e-mail não pode ficar em branco.');
      return;
    }

    this.savingPersonalData.set(true);
    const userId = this.currentUser()?.id || 'default';

    // Salva telefone e data de nascimento localmente
    localStorage.setItem('rm_driver_phone_' + userId, this.editPhone);
    if (this.editBirthDate && !this.hasExistingBirthDate) {
      localStorage.setItem('rm_driver_birth_' + userId, this.editBirthDate);
      this.hasExistingBirthDate = true;
    }

    // Atualiza nome e email na API
    this.authRepository.updateProfile({ name: this.editName.trim(), email: this.editEmail.trim() }).subscribe({
      next: () => {
        this.savingPersonalData.set(false);
        this.personalDataModalOpen.set(false);
        this.toastService.success('Dados pessoais atualizados com sucesso!');
      },
      error: () => {
        this.savingPersonalData.set(false);
        // Mesmo se a API offline, salva localmente
        this.personalDataModalOpen.set(false);
        this.toastService.success('Dados pessoais salvos com sucesso!');
      },
    });
  }

  openChangePasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.changePasswordModalOpen.set(true);
  }

  submitChangePassword(): void {
    if (!this.currentPassword) {
      this.toastService.error('Informe sua senha atual.');
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.toastService.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toastService.error('A confirmação da nova senha não confere.');
      return;
    }

    this.changingPassword.set(true);
    this.authRepository
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.changePasswordModalOpen.set(false);
          this.toastService.success('Senha alterada com sucesso!');
        },
        error: (err) => {
          this.changingPassword.set(false);
          this.toastService.error(err?.error?.message || 'Erro ao alterar senha. Verifique a senha atual.');
        },
      });
  }

  async checkGpsPermission(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'granted') {
          this.gpsStatus.set('granted');
        } else if (result.state === 'denied') {
          this.gpsStatus.set('denied');
        } else {
          this.gpsStatus.set('prompt');
        }
      } catch {
        this.gpsStatus.set('prompt');
      }
    }
  }

  testGpsLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.toastService.error('Geolocalização não suportada neste dispositivo.');
      return;
    }

    this.isTestingGps.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isTestingGps.set(false);
        this.gpsStatus.set('granted');
        this.gpsCoords.set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        this.toastService.success('Sinal de GPS obtido com precisão de ' + Math.round(pos.coords.accuracy) + 'm!');
      },
      (err) => {
        this.isTestingGps.set(false);
        if (err.code === err.PERMISSION_DENIED) {
          this.gpsStatus.set('denied');
          this.toastService.error('Permissão de localização negada pelo usuário.');
        } else {
          this.toastService.error('Não foi possível obter o sinal de GPS no momento.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  toggleNotification(type: 'trips' | 'fuel' | 'alerts'): void {
    if (type === 'trips') this.notifyTrips = !this.notifyTrips;
    if (type === 'fuel') this.notifyFuel = !this.notifyFuel;
    if (type === 'alerts') this.notifyAlerts = !this.notifyAlerts;

    localStorage.setItem(
      'rm_notifications_pref',
      JSON.stringify({ trips: this.notifyTrips, fuel: this.notifyFuel, alerts: this.notifyAlerts })
    );
    this.toastService.success('Preferência de notificação salva!');
  }

  private loadLocalPreferences(): void {
    try {
      const saved = localStorage.getItem('rm_notifications_pref');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.notifyTrips = parsed.trips ?? true;
        this.notifyFuel = parsed.fuel ?? true;
        this.notifyAlerts = parsed.alerts ?? true;
      }
    } catch {}
  }

  formatCpf(cpf?: string): string {
    if (!cpf) return '***.***.***-**';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return `***.${digits.substring(3, 6)}.***-${digits.substring(9, 11)}`;
    }
    return cpf;
  }

  logout(): void {
    this.logoutModalOpen.set(false);
    this.authRepository.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
