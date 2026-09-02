import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
  LucideLogOut
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
    LucideLogOut
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
  sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  }
}
