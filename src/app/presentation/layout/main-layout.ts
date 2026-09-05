import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import {
  LucideTruck,
  LucideLayoutDashboard,
  LucideUsers,
  LucideRoute,
  LucideFuel,
  LucideWrench,
  LucideClock,
  LucideBell,
  LucideFileText,
  LucideUserCheck,
  LucideSettings,
  LucideMenu,
  LucideSearch,
  LucideChevronDown,
  LucideLogOut,
  LucideUser
} from '@lucide/angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideTruck,
    LucideLayoutDashboard,
    LucideUsers,
    LucideRoute,
    LucideFuel,
    LucideWrench,
    LucideClock,
    LucideBell,
    LucideFileText,
    LucideUserCheck,
    LucideSettings,
    LucideMenu,
    LucideSearch,
    LucideChevronDown,
    LucideLogOut,
    LucideUser
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
  private readonly authRepository = inject(IAuthRepository);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  currentUser = this.authState.currentUser;
  sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.authRepository.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}


