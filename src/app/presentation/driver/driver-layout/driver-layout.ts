import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { DriverNotificationService } from '../../../core/services/driver-notification.service';
import { LocationTrackingService } from '../../../core/services/location-tracking.service';
import { ToastService } from '../../../core/services/toast.service';
import { compressImage } from '../../../core/utils/image-compressor';
import {
  LucideLogOut,
  LucideDownload,
  LucideSparkles,
  LucideX,
  LucideBell,
  LucideCheckCheck,
  LucideTrash2,
  LucideTruck,
  LucideFuel,
  LucideInfo,
  LucideRefreshCw,
  LucideCheck,
  LucideCamera,
  LucideLoader2,
  LucideImage,
  LucideHome,
  LucideFileText,
  LucideUser,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    LucideLogOut,
    LucideDownload,
    LucideSparkles,
    LucideX,
    LucideBell,
    LucideCheckCheck,
    LucideTrash2,
    LucideTruck,
    LucideFuel,
    LucideInfo,
    LucideRefreshCw,
    LucideCheck,
    LucideCamera,
    LucideLoader2,
    LucideImage,
    LucideHome,
    LucideFileText,
    LucideUser,
  ],
  templateUrl: './driver-layout.html',
})
export class DriverLayoutComponent implements OnInit {
  private readonly authRepository = inject(IAuthRepository);
  private readonly portalRepository = inject(IDriverPortalRepository);
  private readonly authState = inject(AuthStateService);
  private readonly networkService = inject(NetworkStatusService);
  readonly updateService = inject(AppUpdateService);
  readonly notificationService = inject(DriverNotificationService);
  private readonly locationTracking = inject(LocationTrackingService);
  private readonly toastService = inject(ToastService);
  readonly router = inject(Router);

  isCurrentTab(tab: 'home' | 'trips' | 'fuel' | 'profile'): boolean {
    const url = this.router.url;
    if (tab === 'home') {
      return (url === '/motorista' || url === '/motorista/') && !this.isProfileOpen();
    }
    if (tab === 'trips') {
      return url.startsWith('/motorista/historico') && !url.includes('tab=fuel') && !this.isProfileOpen();
    }
    if (tab === 'fuel') {
      return url.startsWith('/motorista/historico') && url.includes('tab=fuel') && !this.isProfileOpen();
    }
    if (tab === 'profile') {
      return this.isProfileOpen();
    }
    return false;
  }

  readonly currentUser = computed(() => this.authState.currentUser());
  readonly isOnline = computed(() => this.networkService.isOnline());
  readonly pendingReceipts = signal<number>(0);
  readonly isProfileOpen = signal<boolean>(false);
  readonly driverPhoto = signal<string | null>(null);
  readonly isUploadingPhoto = signal<boolean>(false);

  @ViewChild('scrollContainer') private scrollContainerRef?: ElementRef<HTMLElement>;

  // Sinais de estado do Pull-to-Refresh
  readonly pullDistance = signal<number>(0);
  readonly pullRotation = signal<number>(0);
  readonly isReadyToRefresh = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);

  private touchStartY: number | null = null;
  private touchStartX: number | null = null;
  private activeChildComponent: any = null;

  onActivate(component: any): void {
    this.activeChildComponent = component;
  }

  onTouchStart(event: TouchEvent): void {
    if (this.isRefreshing()) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || this.scrollContainerRef?.nativeElement?.scrollTop || 0;
    // Permite iniciar o puxar apenas se o scroll estiver no topo absoluto
    if (scrollY > 2) {
      this.touchStartY = null;
      this.touchStartX = null;
      return;
    }
    if (event.touches.length === 1) {
      this.touchStartY = event.touches[0].clientY;
      this.touchStartX = event.touches[0].clientX;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.isRefreshing() || this.touchStartY === null || this.touchStartX === null) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || this.scrollContainerRef?.nativeElement?.scrollTop || 0;
    if (scrollY > 2) {
      if (this.pullDistance() > 0) {
        this.pullDistance.set(0);
        this.pullRotation.set(0);
        this.isReadyToRefresh.set(false);
      }
      return;
    }

    const currentY = event.touches[0].clientY;
    const currentX = event.touches[0].clientX;
    const deltaY = currentY - this.touchStartY;
    const deltaX = currentX - this.touchStartX;

    // Se estiver rolando para baixo (conteúdo subindo, deltaY <= 0), permite scroll nativo livre
    if (deltaY <= 0) {
      return;
    }

    // Ignora gestos predominantemente horizontais
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      return;
    }

    if (deltaY > 0) {
      this.isDragging.set(true);
      // Damping elástico (máximo 70px)
      const damped = Math.min(70, deltaY * 0.4);
      this.pullDistance.set(damped);
      this.pullRotation.set(Math.min(360, (damped / 55) * 360));

      const ready = damped >= 55;
      if (ready && !this.isReadyToRefresh()) {
        this.isReadyToRefresh.set(true);
        this.triggerHapticFeedback();
      } else if (!ready && this.isReadyToRefresh()) {
        this.isReadyToRefresh.set(false);
      }
    }
  }

  onTouchEnd(): void {
    this.isDragging.set(false);
    this.touchStartY = null;
    this.touchStartX = null;

    if (this.isRefreshing()) return;

    if (this.isReadyToRefresh()) {
      this.executeRefresh();
    } else {
      this.pullDistance.set(0);
      this.pullRotation.set(0);
      this.isReadyToRefresh.set(false);
    }
  }

  async executeRefresh(): Promise<void> {
    this.isRefreshing.set(true);
    this.isReadyToRefresh.set(false);
    this.pullDistance.set(56);
    this.triggerHapticFeedback();

    const startTime = Date.now();

    try {
      // 1. Recarrega a view ativa do motorista
      if (this.activeChildComponent) {
        if (typeof this.activeChildComponent.loadData === 'function') {
          this.activeChildComponent.loadData(true);
        } else if (typeof this.activeChildComponent.loadAllData === 'function') {
          this.activeChildComponent.loadAllData(true);
        }
      }

      // 2. Atualiza contador de pendências de recibos
      this.refreshPendingCount();

      // 3. Verifica atualizações de versão do app
      this.updateService.checkForUpdates();
    } catch {
      // Falhas não travam o fluxo de animação
    }

    // Garante no mínimo 700ms de animação do spinner para percepção do usuário
    const elapsed = Date.now() - startTime;
    const minDelay = 700;
    if (elapsed < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
    }

    // Exibe check de concluído brevemente
    this.isSuccess.set(true);
    this.isRefreshing.set(false);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Retrai o indicador suavemente
    this.isSuccess.set(false);
    this.pullDistance.set(0);
    this.pullRotation.set(0);
  }

  private async triggerHapticFeedback(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
    }
  }

  openProfile(): void {
    this.isProfileOpen.set(true);
  }

  closeProfile(): void {
    this.isProfileOpen.set(false);
  }

  checkUpdatesManually(): void {
    this.updateService.checkForUpdates();
  }

  ngOnInit(): void {
    this.refreshPendingCount();
  }

  refreshPendingCount(): void {
    this.portalRepository.getCurrentTrip().subscribe({
      next: (summary) => {
        this.pendingReceipts.set(summary.pendingReceiptsCount ?? 0);
        if (summary.driver?.photoUrl) {
          this.driverPhoto.set(summary.driver.photoUrl);
        }
      },
      error: () => {},
    });
  }

  async onProfilePhotoSelected(event: Event): Promise<void> {
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
          this.toastService.error('Erro ao salvar foto de perfil.');
        },
      });
    } catch (err: any) {
      this.isUploadingPhoto.set(false);
      this.toastService.error(err.message || 'Erro ao processar imagem.');
    } finally {
      input.value = '';
    }
  }

  removeProfilePhoto(): void {
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

  logout(): void {
    this.locationTracking.stopTracking();
    this.authRepository.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authState.clear();
        this.router.navigate(['/login']);
      },
    });
  }
}
