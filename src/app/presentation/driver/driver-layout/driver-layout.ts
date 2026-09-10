import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { DriverNotificationService } from '../../../core/services/driver-notification.service';
import {
  LucideNavigation,
  LucideClock,
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
} from '@lucide/angular';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideNavigation,
    LucideClock,
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
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authState.currentUser());
  readonly isOnline = computed(() => this.networkService.isOnline());
  readonly pendingReceipts = signal<number>(0);

  ngOnInit(): void {
    this.refreshPendingCount();
  }

  refreshPendingCount(): void {
    this.portalRepository.getCurrentTrip().subscribe({
      next: (summary) => {
        this.pendingReceipts.set(summary.pendingReceiptsCount ?? 0);
      },
      error: () => {},
    });
  }

  logout(): void {
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
