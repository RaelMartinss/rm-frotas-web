import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
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
  LucideLoader2
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
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
    LucideLoader2
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardRepository = inject(IDashboardRepository);

  data = signal<DashboardSummary | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.dashboardRepository.getSummary().subscribe({
      next: (summary) => {
        this.data.set(summary);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Falha ao carregar os dados da dashboard.');
        this.loading.set(false);
      }
    });
  }
}
