import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import {
  LucideNavigation,
  LucideClock,
  LucideLogOut,
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
  ],
  templateUrl: './driver-layout.html',
})
export class DriverLayoutComponent {
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly networkService = inject(NetworkStatusService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authState.currentUser());
  readonly isOnline = computed(() => this.networkService.isOnline());

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
