import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { Vehicle } from '../../../../domain/models/vehicle.model';

export interface ReportFilterState {
  from: string;
  to: string;
  vehicleId?: string;
  preset: 'current_month' | 'last_month' | 'last_30' | 'last_90' | 'custom';
}

@Component({
  selector: 'app-report-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- PRESETS & DATAS -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200/80 gap-0.5">
          <button
            type="button"
            (click)="selectPreset('current_month')"
            [ngClass]="preset() === 'current_month' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            class="px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Mês atual
          </button>
          <button
            type="button"
            (click)="selectPreset('last_month')"
            [ngClass]="preset() === 'last_month' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            class="px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Mês anterior
          </button>
          <button
            type="button"
            (click)="selectPreset('last_30')"
            [ngClass]="preset() === 'last_30' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            class="px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            (click)="selectPreset('last_90')"
            [ngClass]="preset() === 'last_90' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            class="px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Últimos 90 dias
          </button>
          <button
            type="button"
            (click)="selectPreset('custom')"
            [ngClass]="preset() === 'custom' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            class="px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
          >
            Personalizado
          </button>
        </div>

        <!-- INPUTS DE DATA (Ativos ou para ajuste fino) -->
        <div class="flex items-center gap-2">
          <input
            type="date"
            [ngModel]="from()"
            (ngModelChange)="onFromChange($event)"
            class="px-2.5 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono shadow-2xs"
          />
          <span class="text-xs text-slate-400 font-medium">até</span>
          <input
            type="date"
            [ngModel]="to()"
            (ngModelChange)="onToChange($event)"
            class="px-2.5 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono shadow-2xs"
          />
        </div>
      </div>

      <!-- SELETOR DE VEÍCULO -->
      <div class="flex items-center gap-2">
        <select
          [ngModel]="selectedVehicleId()"
          (ngModelChange)="onVehicleChange($event)"
          class="w-full sm:w-64 px-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
        >
          <option value="">Todos os veículos</option>
          @for (v of vehicles(); track v.id) {
            <option [value]="v.id">{{ v.plate }} - {{ v.model }}</option>
          }
        </select>
      </div>
    </div>
  `,
})
export class ReportFilterBarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vehicleRepo = inject(IVehicleRepository);

  readonly filtersChange = output<ReportFilterState>();

  readonly preset = signal<'current_month' | 'last_month' | 'last_30' | 'last_90' | 'custom'>('current_month');
  readonly from = signal<string>('');
  readonly to = signal<string>('');
  readonly selectedVehicleId = signal<string>('');
  readonly vehicles = signal<Vehicle[]>([]);

  ngOnInit(): void {
    this.loadVehicles();
    this.initFromUrlParams();
  }

  private loadVehicles(): void {
    this.vehicleRepo.getAll({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicles.set(res.data || []);
      },
      error: () => {},
    });
  }

  private initFromUrlParams(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['from'] && qp['to']) {
      this.from.set(qp['from']);
      this.to.set(qp['to']);
      this.selectedVehicleId.set(qp['vehicleId'] || '');
      this.preset.set((qp['preset'] as any) || 'custom');
      this.emitCurrent();
    } else {
      this.selectPreset('current_month', false);
    }
  }

  selectPreset(preset: 'current_month' | 'last_month' | 'last_30' | 'last_90' | 'custom', updateUrl: boolean = true): void {
    this.preset.set(preset);
    const now = new Date();
    const todayStr = this.formatDate(now);

    switch (preset) {
      case 'current_month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.from.set(this.formatDate(firstDay));
        this.to.set(todayStr);
        break;
      }
      case 'last_month': {
        const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
        this.from.set(this.formatDate(firstDayPrev));
        this.to.set(this.formatDate(lastDayPrev));
        break;
      }
      case 'last_30': {
        const past30 = new Date(now.getTime() - 29 * 86400000);
        this.from.set(this.formatDate(past30));
        this.to.set(todayStr);
        break;
      }
      case 'last_90': {
        const past90 = new Date(now.getTime() - 89 * 86400000);
        this.from.set(this.formatDate(past90));
        this.to.set(todayStr);
        break;
      }
      case 'custom':
        break;
    }

    if (updateUrl) {
      this.syncUrlAndEmit();
    } else {
      this.emitCurrent();
    }
  }

  onFromChange(val: string): void {
    this.from.set(val);
    this.preset.set('custom');
    this.syncUrlAndEmit();
  }

  onToChange(val: string): void {
    this.to.set(val);
    this.preset.set('custom');
    this.syncUrlAndEmit();
  }

  onVehicleChange(val: string): void {
    this.selectedVehicleId.set(val || '');
    this.syncUrlAndEmit();
  }

  private syncUrlAndEmit(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        from: this.from(),
        to: this.to(),
        vehicleId: this.selectedVehicleId() || null,
        preset: this.preset(),
      },
      queryParamsHandling: 'merge',
    });

    this.emitCurrent();
  }

  private emitCurrent(): void {
    this.filtersChange.emit({
      from: this.from(),
      to: this.to(),
      vehicleId: this.selectedVehicleId() || undefined,
      preset: this.preset(),
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
