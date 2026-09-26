import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { IMaintenanceRepository } from '../../../../domain/repositories/maintenance.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import {
  LucideCheckCircle2,
  LucideAlertCircle,
  LucideLoader2
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-finish-maintenance-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideLoader2
  ],
  template: `
    @if (isOpen() && vehicle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <svg lucideCheckCircle2 class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Finalizar Manutenção</h3>
              <p class="text-xs text-slate-500 mt-1">
                Os serviços foram concluídos? O veículo retornará ao status <strong>Disponível</strong>.
              </p>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-left space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Placa:</span>
                <span class="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">{{ vehicle()?.plate }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Modelo:</span>
                <span class="font-semibold text-slate-700">{{ vehicle()?.brand }} {{ vehicle()?.model }}</span>
              </div>
            </div>

            @if (actionError()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ actionError() }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isActionLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                (click)="confirmFinishMaintenance()"
                [disabled]="isActionLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isActionLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Liberar Veículo
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class VehicleFinishMaintenanceModalComponent {
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);

  close = output<void>();
  maintenanceFinished = output<void>();

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  onClose(): void {
    this.close.emit();
    this.actionError.set(null);
  }

  confirmFinishMaintenance(): void {
    const v = this.vehicle();
    if (!v) return;

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepository
      .getAll({ vehicleId: v.id, status: 'EM_ANDAMENTO', limit: 1 })
      .subscribe({
        next: (res) => {
          const activeMaintenance = res.data?.[0];
          if (activeMaintenance) {
            this.maintenanceRepository
              .finish(activeMaintenance.id, {
                odometerAtService: v.currentKm,
                finishedAt: new Date().toISOString(),
              })
              .subscribe({
                next: () => {
                  this.isActionLoading.set(false);
                  this.toastService.success(`Manutenção finalizada! Veículo ${v.plate} liberado.`);
                  this.maintenanceFinished.emit();
                  this.onClose();
                },
                error: (err) => {
                  this.isActionLoading.set(false);
                  const msg = err?.error?.message || 'Não foi possível finalizar a manutenção.';
                  this.actionError.set(msg);
                  this.toastService.error(msg);
                },
              });
          } else {
            this.vehicleRepository.finishMaintenance(v.id).subscribe({
              next: () => {
                this.isActionLoading.set(false);
                this.toastService.success(`Manutenção finalizada! Veículo ${v.plate} liberado.`);
                this.maintenanceFinished.emit();
                this.onClose();
              },
              error: (err) => {
                this.isActionLoading.set(false);
                const msg = err?.error?.message || 'Não foi possível finalizar a manutenção.';
                this.actionError.set(msg);
                this.toastService.error(msg);
              },
            });
          }
        },
        error: () => {
          this.vehicleRepository.finishMaintenance(v.id).subscribe({
            next: () => {
              this.isActionLoading.set(false);
              this.toastService.success(`Manutenção finalizada! Veículo ${v.plate} liberado.`);
              this.maintenanceFinished.emit();
              this.onClose();
            },
            error: (err) => {
              this.isActionLoading.set(false);
              const msg = err?.error?.message || 'Não foi possível finalizar a manutenção.';
              this.actionError.set(msg);
              this.toastService.error(msg);
            },
          });
        }
      });
  }
}
