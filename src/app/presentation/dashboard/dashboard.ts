import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import { AuthStateService } from '../../core/services/auth-state.service';
import { DashboardSummary } from '../../domain/models/dashboard.model';
import {
  LucideTruck,
  LucideCar,
  LucideCheck,
  LucideCheckCircle2,
  LucideWrench,
  LucideXCircle,
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideFileText,
  LucideShieldAlert,
  LucideTrendingUp,
  LucideArrowUp,
  LucideLoader2,
  LucideNavigation,
  LucideUsers
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideTruck,
    LucideCar,
    LucideCheck,
    LucideCheckCircle2,
    LucideWrench,
    LucideXCircle,
    LucideAlertCircle,
    LucideAlertTriangle,
    LucideFileText,
    LucideShieldAlert,
    LucideTrendingUp,
    LucideArrowUp,
    LucideLoader2,
    LucideNavigation,
    LucideUsers
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardRepository = inject(IDashboardRepository);
  private readonly authState = inject(AuthStateService);

  data = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  userFirstName = computed(() => {
    const user = this.authState.currentUser();
    if (!user || !user.name) return 'Gestor';
    return user.name.split(' ')[0];
  });

  expiredExpirationsCount = computed(() => {
    return this.data()?.expirations.filter((e) => e.daysRemaining <= 0).length || 0;
  });

  expiringIn30DaysCount = computed(() => {
    return (
      this.data()?.expirations.filter((e) => e.daysRemaining > 0 && e.daysRemaining <= 30).length || 0
    );
  });

  expiringIn60DaysCount = computed(() => {
    return (
      this.data()?.expirations.filter((e) => e.daysRemaining > 30 && e.daysRemaining <= 60).length || 0
    );
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardRepository.getSummary().subscribe({
      next: (summary) => {
        this.data.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Falha ao carregar os dados da dashboard.');
        this.loading.set(false);
      }
    });
  }
}
