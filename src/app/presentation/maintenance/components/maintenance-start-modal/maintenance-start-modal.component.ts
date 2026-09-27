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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <svg lucidePlay class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Iniciar Manutenção</h3>
              <p class="text-xs text-slate-500 mt-1">
                Deseja colocar esta ordem em andamento? O veículo <strong>{{ maintenance?.vehicle?.plate }}</strong> será marcado como <strong>Em Manutenção</strong> e ficará indisponível para viagens.
              </p>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-left space-y-1.5 text-xs">
              <div><span class="text-slate-400">Tipo:</span> <span class="font-semibold text-slate-700">{{ maintenance?.type }}</span></div>
              <div><span class="text-slate-400">Descrição:</span> <span class="text-slate-800 font-medium">{{ maintenance?.description }}</span></div>
            </div>

            @if (isVehicleInUse) {
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs text-left">
                <svg lucideAlertTriangle class="size-4 text-amber-600 shrink-0 mt-0.5"></svg>
                <div>
                  <strong class="font-semibold block">Veículo em Viagem / Uso</strong>
                  <span>Este veículo está atualmente em viagem. Conclua ou finalize a viagem antes de iniciar a manutenção.</span>
                </div>
              </div>
            }

            @if (errorMessage) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isLoading"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                (click)="onConfirm()"
                [disabled]="isLoading || isVehicleInUse"
                [title]="isVehicleInUse ? 'Veículo em viagem: finalize a viagem antes de iniciar a manutenção' : 'Confirmar Início'"
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
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
