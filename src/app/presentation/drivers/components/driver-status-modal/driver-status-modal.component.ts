import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideUserCheck,
  LucideBan,
  LucideAlertCircle,
  LucideLoader2
} from '@lucide/angular';
import { Driver, DriverStatus } from '../../../../domain/models/driver.model';

@Component({
  selector: 'app-driver-status-modal',
  standalone: true,
  imports: [CommonModule, LucideUserCheck, LucideBan, LucideAlertCircle, LucideLoader2],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div
              class="size-12 rounded-2xl flex items-center justify-center mx-auto border"
              [ngClass]="pendingAction() === 'activate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-[#8E9DA8] border-[#222A2F]'"
            >
              @if (pendingAction() === 'activate') {
                <svg lucideUserCheck class="size-6"></svg>
              } @else {
                <svg lucideBan class="size-6"></svg>
              }
            </div>

            <div>
              <h3 class="text-base font-bold text-white">
                {{ pendingAction() === 'activate' ? 'Ativar Motorista' : 'Desativar Motorista' }}
              </h3>
              <p class="text-xs text-[#8E9DA8] mt-1">
                @if (pendingAction() === 'activate') {
                  Deseja reativar o motorista? Ele ficará disponível para alocação em viagens.
                } @else {
                  Deseja desativar o cadastro do motorista? Ele não poderá ser escalado.
                }
              </p>
            </div>

            <div class="p-4 bg-[#11161A] rounded-xl border border-[#222A2F] text-left space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">Motorista:</span>
                <span class="font-bold text-white">{{ driver()?.name }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">CPF:</span>
                <span class="font-mono text-white">{{ driver()?.cpf }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">Status Atual:</span>
                <span class="font-semibold text-white">{{ getDriverStatusLabel(driver()!.status) }}</span>
              </div>
            </div>

            @if (errorMessage()) {
              <div class="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirm.emit()"
                [disabled]="isLoading()"
                [ngClass]="pendingAction() === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'"
                class="flex-1 py-2.5 text-xs font-semibold text-white rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DriverStatusModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly pendingAction = input<'activate' | 'deactivate' | null>('activate');
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly close = output<void>();
  readonly confirm = output<void>();

  getDriverStatusLabel(status: DriverStatus): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'Ativo';
      case 'EM_VIAGEM':
        return 'Em Viagem';
      case 'INACTIVE':
      case 'FOLGA':
        return 'Inativo';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'Suspenso';
    }
  }
}
