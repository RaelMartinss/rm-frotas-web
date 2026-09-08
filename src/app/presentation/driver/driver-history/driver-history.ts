import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IDriverPortalRepository } from '../../../domain/repositories/driver-portal.repository.interface';
import { DriverHistoryItem } from '../../../domain/models/driver-portal.model';
import {
  LucideClock,
  LucideTruck,
  LucideCheckCircle2,
  LucideXCircle,
  LucideArrowLeft,
  LucideRefreshCw,
} from '@lucide/angular';

@Component({
  selector: 'app-driver-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideClock,
    LucideTruck,
    LucideCheckCircle2,
    LucideXCircle,
    LucideArrowLeft,
    LucideRefreshCw,
  ],
  templateUrl: './driver-history.html',
})
export class DriverHistoryComponent implements OnInit {
  private readonly portalRepository = inject(IDriverPortalRepository);

  readonly history = signal<DriverHistoryItem[]>([]);
  readonly loading = signal<boolean>(true);
  readonly refreshing = signal<boolean>(false);

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.portalRepository.getHistory().subscribe({
      next: (items) => {
        this.history.set(items);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }
}
