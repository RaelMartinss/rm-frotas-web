import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IMaintenanceRepository } from '../../../../domain/repositories/maintenance.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { Maintenance } from '../../../../domain/models/maintenance.model';
import {
  LucideWrench,
  LucideX,
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideExternalLink,
  LucidePlay,
  LucideLoader2,
  LucideCheckCircle2
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-maintenance-info-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    LucideWrench,
    LucideX,
    LucideAlertCircle,
    LucideAlertTriangle,
    LucideExternalLink,
    LucidePlay,
    LucideLoader2,
    LucideCheckCircle2
  ],
  template: `
    @if (isOpen() && vehicle() && maintenance()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11]">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg flex items-center justify-center border bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20 shadow-2xs">
                <svg lucideWrench class="size-4"></svg>
              </div>
              <div>
                <h2 class="text-sm font-bold text-white">Informativo de Manutenção</h2>
                <p class="text-[11px] text-[#8E9DA8] font-mono">{{ vehicle()?.plate }} • {{ vehicle()?.brand }} {{ vehicle()?.model }}</p>
              </div>
            </div>
            <button (click)="onClose()" class="text-[#8E9DA8] hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Status Badge Card -->
            <div class="p-4 rounded-xl border flex items-center justify-between bg-[#11161A] border-[#222A2F]">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#8E9DA8] block">Status da Manutenção</span>
                <div class="text-sm font-bold mt-0.5 flex items-center gap-1.5 text-white">
                  <span
                    class="size-2 rounded-full animate-pulse"
                    [ngClass]="maintenance()?.status === 'EM_ANDAMENTO' ? 'bg-amber-400' : 'bg-blue-400'"
                  ></span>
                  {{ maintenance()?.status === 'EM_ANDAMENTO' ? 'Em Andamento na Oficina' : 'Manutenção Agendada' }}
                </div>
              </div>
              <span
                class="px-2.5 py-1 rounded-full text-xs font-bold border"
                [ngClass]="maintenance()?.type === 'PREVENTIVA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'"
              >
                {{ maintenance()?.type === 'PREVENTIVA' ? 'Revisão Preventiva' : 'Manutenção Corretiva' }}
              </span>
            </div>

            <!-- Detalhes do Serviço -->
            <div class="bg-[#11161A] rounded-xl p-4 border border-[#222A2F] space-y-3">
              <div>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-[#8E9DA8] block">Descrição do Serviço / Motivo</span>
                <p class="text-xs text-[#CAD2D9] font-medium mt-1 leading-relaxed whitespace-pre-line">
                  {{ maintenance()?.description }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2 border-t border-[#222A2F]">
                <div>
                  <span class="text-[10px] font-semibold text-[#8E9DA8] block">Oficina / Prestador</span>
                  <span class="text-xs font-semibold text-white">
                    {{ maintenance()?.serviceProvider || 'Oficina interna / Não inf.' }}
                  </span>
                </div>
                <div>
                  @if (maintenance()?.status === 'EM_ANDAMENTO') {
                    <span class="text-[10px] font-semibold text-[#8E9DA8] block">Iniciado em</span>
                    <span class="text-xs font-semibold text-white font-mono">
                      {{ maintenance()?.startedAt ? (maintenance()?.startedAt | date:'dd/MM/yyyy') : '-' }}
                    </span>
                  } @else {
                    <span class="text-[10px] font-semibold text-[#8E9DA8] block">Data Prevista</span>
                    <span class="text-xs font-semibold text-white font-mono">
                      {{ maintenance()?.scheduledDate ? (maintenance()?.scheduledDate | date:'dd/MM/yyyy') : '-' }}
                    </span>
                  }
                </div>
              </div>

              @if (maintenance()?.cost || (maintenance()?.items && maintenance()!.items!.length > 0)) {
                <div class="pt-2 border-t border-[#222A2F] flex justify-between items-center text-xs">
                  <span class="text-[#8E9DA8] font-medium">Custo Estimado / Registrado:</span>
                  <span class="font-bold text-white font-mono">
                    {{ maintenance()?.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>
              }
            </div>

            @if (isInUse()) {
              <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs">
                <svg lucideAlertTriangle class="size-4 text-amber-400 shrink-0 mt-0.5"></svg>
                <div>
                  <strong class="font-semibold block">Veículo em Viagem / Uso</strong>
                  <span>Este veículo está atualmente em viagem. Conclua ou finalize a viagem antes de iniciar a manutenção.</span>
                </div>
              </div>
            }

            @if (actionError()) {
              <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ actionError() }}</span>
              </div>
            }

            <!-- Botões de Ação -->
            <div class="pt-2 border-t border-[#222A2F] flex flex-col gap-2.5">
              <div class="flex items-center gap-2">
                <!-- Botão Ir para Gestão de Manutenções -->
                <button
                  type="button"
                  (click)="goToMaintenanceModule()"
                  class="flex-1 py-2.5 px-3 text-xs font-semibold text-[#8E9DA8] hover:text-white bg-[#171D21] hover:bg-[#222A2F] border border-[#222A2F] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg lucideExternalLink class="size-3.5 text-[#8E9DA8]"></svg>
                  <span>Ver em Manutenções</span>
                </button>

                <!-- Ação contextual: Iniciar (se Agendada) ou Finalizar (se Em Andamento) -->
                @if (maintenance()?.status === 'AGENDADA') {
                  <button
                    type="button"
                    (click)="startScheduledMaintenance()"
                    [disabled]="isActionLoading() || isInUse()"
                    [title]="isInUse() ? 'Veículo em viagem: finalize a viagem antes de iniciar a manutenção' : 'Iniciar Agora'"
                    class="flex-1 py-2.5 px-3 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (isActionLoading()) {
                      <svg lucideLoader2 class="size-3.5 animate-spin"></svg>
                    } @else {
                      <svg lucidePlay class="size-3.5"></svg>
                    }
                    <span>Iniciar Agora</span>
                  </button>
                } @else if (maintenance()?.status === 'EM_ANDAMENTO') {
                  <button
                    type="button"
                    (click)="onOpenFinish()"
                    class="flex-1 py-2.5 px-3 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <svg lucideCheckCircle2 class="size-3.5"></svg>
                    <span>Finalizar Manutenção</span>
                  </button>
                }
              </div>

              <button
                type="button"
                (click)="onClose()"
                class="w-full py-2 text-xs font-medium text-[#8E9DA8] hover:text-white transition-colors cursor-pointer text-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class VehicleMaintenanceInfoModalComponent {
  private readonly router = inject(Router);
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);
  maintenance = input<Maintenance | null>(null);

  close = output<void>();
  openFinish = output<Vehicle>();
  maintenanceStarted = output<void>();

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  isInUse(): boolean {
    const v = this.vehicle();
    if (!v) return false;
    return v.status === 'IN_USE' || v.status === 'EM_VIAGEM';
  }

  onClose(): void {
    this.close.emit();
    this.actionError.set(null);
  }

  onOpenFinish(): void {
    const v = this.vehicle();
    if (v) {
      this.openFinish.emit(v);
      this.onClose();
    }
  }

  goToMaintenanceModule(): void {
    const v = this.vehicle();
    this.onClose();
    if (v?.id) {
      this.router.navigate(['/manutencoes'], { queryParams: { vehicleId: v.id } });
    } else {
      this.router.navigate(['/manutencoes']);
    }
  }

  startScheduledMaintenance(): void {
    const m = this.maintenance();
    const v = this.vehicle();
    if (!m) return;

    if (this.isInUse()) {
      const msg = 'Veículo em viagem/uso: conclua a viagem antes de iniciar a manutenção.';
      this.actionError.set(msg);
      this.toastService.warning(msg);
      return;
    }

    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.maintenanceRepository.start(m.id).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Manutenção do veículo ${v?.plate || ''} iniciada com sucesso!`);
        this.maintenanceStarted.emit();
        this.onClose();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err?.error?.message || 'Não foi possível iniciar a manutenção agendada.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }
}
