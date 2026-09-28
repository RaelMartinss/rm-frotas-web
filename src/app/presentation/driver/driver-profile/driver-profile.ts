import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { DriverPortalSummary } from '../../../domain/models/driver-portal.model';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { ToastService } from '../../../core/services/toast.service';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { compressImage } from '../../../core/utils/image-compressor';
import {
  LucideSettings,
  LucideCamera,
  LucideUser,
  LucideCreditCard,
  LucideCalendar,
  LucideTruck,
  LucideMapPin,
  LucideChevronRight,
  LucideTrendingUp,
  LucideFuel,
  LucideArrowRight,
  LucideLogOut,
  LucideX,
  LucideLoader2,
  LucideDownload,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideSettings,
    LucideCamera,
    LucideUser,
    LucideCreditCard,
    LucideCalendar,
    LucideTruck,
    LucideMapPin,
    LucideChevronRight,
    LucideTrendingUp,
    LucideFuel,
    LucideArrowRight,
    LucideLogOut,
    LucideX,
    LucideLoader2,
    LucideDownload,
  ],
  templateUrl: './driver-profile.html',
})
export class DriverProfileComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly authRepository = inject(IAuthRepository);
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly toastService = inject(ToastService);
  readonly updateService = inject(AppUpdateService);
  private readonly router = inject(Router);

  readonly summary = signal<DriverPortalSummary | null>(null);
  readonly loading = signal<boolean>(true);
  readonly driverPhoto = signal<string | null>(null);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly settingsModalOpen = signal<boolean>(false);

  readonly currentUser = computed(() => this.authState.currentUser());

  readonly initials = computed(() => {
    const name = this.summary()?.driver?.name || this.currentUser()?.name || 'MV';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    this.loading.set(true);
    this.portalRepository.getCurrentTrip().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        if (summary.driver?.photoUrl) {
          this.driverPhoto.set(summary.driver.photoUrl);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      this.isUploadingPhoto.set(true);
      const compressed = await compressImage(file, 600, 600, 0.8);
      this.portalRepository.updateProfilePhoto(compressed).subscribe({
        next: (res) => {
          this.isUploadingPhoto.set(false);
          this.driverPhoto.set(res.photoUrl || compressed);
          this.toastService.success('Foto de perfil atualizada com sucesso!');
        },
        error: () => {
          this.isUploadingPhoto.set(false);
          this.toastService.error('Erro ao atualizar foto de perfil.');
        },
      });
    } catch (err: any) {
      this.isUploadingPhoto.set(false);
      this.toastService.error(err.message || 'Erro ao processar imagem.');
    }
  }

  removePhoto(): void {
    if (!this.driverPhoto()) return;
    this.isUploadingPhoto.set(true);
    this.portalRepository.updateProfilePhoto(null).subscribe({
      next: () => {
        this.isUploadingPhoto.set(false);
        this.driverPhoto.set(null);
        this.toastService.success('Foto removida com sucesso!');
      },
      error: () => {
        this.isUploadingPhoto.set(false);
        this.toastService.error('Erro ao remover foto.');
      },
    });
  }

  formatCpf(cpf?: string): string {
    if (!cpf) return '***.***.***-**';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return `***.${digits.substring(3, 6)}.***-${digits.substring(9, 11)}`;
    }
    return cpf;
  }

  maskCnh(cnh?: string): string {
    if (!cnh) return '****1234';
    const cleaned = cnh.trim();
    if (cleaned.length >= 4) {
      return '****' + cleaned.slice(-4);
    }
    return cleaned;
  }

  logout(): void {
    this.settingsModalOpen.set(false);
    this.authRepository.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
