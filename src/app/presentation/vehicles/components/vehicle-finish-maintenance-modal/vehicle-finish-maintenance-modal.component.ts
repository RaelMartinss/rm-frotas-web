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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <svg lucideCheckCircle2 class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Finalizar Manutenção</h3>
              <p class="text-xs text-[#8E9DA8] mt-1">
                Os serviços foram concluídos? O veículo retornará ao status <strong class="text-emerald-400">Disponível</strong>.
              </p>
            </div>

            <div class="p-4 bg-[#11161A] rounded-xl border border-[#222A2F] text-left space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-[#8E9DA8]">Placa:</span>
                <span class="font-mono font-bold text-white bg-[#0F1215] px-2 py-0.5 rounded border border-[#222A2F]">{{ vehicle()?.plate }}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-[#8E9DA8]">Modelo:</span>
                <span class="font-semibold text-white">{{ vehicle()?.brand }} {{ vehicle()?.model }}</span>
              </div>
            </div>

            @if (actionError()) {
              <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ actionError() }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isActionLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-[#8E9DA8] hover:text-white bg-[#171D21] hover:bg-[#222A2F] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                (click)="confirmFinishMaintenance()"
                [disabled]="isActionLoading()"
                class="flex-1 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
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
