import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Maintenance } from '../../../../domain/models/maintenance.model';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideLoader2,
  LucidePlay,
} from '@lucide/angular';

@Component({
  selector: 'app-maintenance-start-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucidePlay,
    LucideAlertTriangle,
    LucideAlertCircle,
    LucideLoader2,
  ],
  template: `
    @if (isOpen && maintenance) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <svg lucidePlay class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Iniciar Manutenção</h3>
              <p class="text-xs text-[#8E9DA8] mt-1 leading-relaxed">
                Deseja colocar esta ordem em andamento? O veículo <strong class="text-white font-mono">{{ maintenance?.vehicle?.plate }}</strong> será marcado como <strong class="text-amber-400">Em Manutenção</strong> e ficará indisponível para viagens.
              </p>
            </div>

            <div class="p-4 bg-[#11161A] rounded-xl border border-[#222A2F] text-left space-y-1.5 text-xs">
              <div><span class="text-[#8E9DA8]">Tipo:</span> <span class="font-semibold text-white ml-1.5">{{ maintenance?.type }}</span></div>
              <div><span class="text-[#8E9DA8]">Descrição:</span> <span class="text-white font-medium ml-1.5">{{ maintenance?.description }}</span></div>
            </div>

            @if (isVehicleInUse) {
              <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs text-left">
                <svg lucideAlertTriangle class="size-4 text-amber-400 shrink-0 mt-0.5"></svg>
                <div>
                  <strong class="font-semibold block">Veículo em Viagem / Uso</strong>
                  <span>Este veículo está atualmente em viagem. Conclua ou finalize a viagem antes de iniciar a manutenção.</span>
                </div>
              </div>
            }

            @if (errorMessage) {
              <div class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isLoading"
                class="flex-1 py-2.5 text-xs font-semibold text-[#8E9DA8] hover:text-white bg-[#171D21] hover:bg-[#222A2F] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                (click)="onConfirm()"
                [disabled]="isLoading || isVehicleInUse"
                [title]="isVehicleInUse ? 'Veículo em viagem: finalize a viagem antes de iniciar a manutenção' : 'Confirmar Início'"
                class="flex-1 py-2.5 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                @if (isLoading) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Confirmar Início
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class MaintenanceStartModalComponent {
  @Input() isOpen = false;
  @Input() maintenance: Maintenance | null = null;
  @Input() isVehicleInUse = false;
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
