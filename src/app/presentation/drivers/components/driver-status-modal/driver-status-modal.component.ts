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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div
              class="size-12 rounded-2xl flex items-center justify-center mx-auto border"
              [ngClass]="pendingAction() === 'activate' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
            >
              @if (pendingAction() === 'activate') {
                <svg lucideUserCheck class="size-6"></svg>
              } @else {
                <svg lucideBan class="size-6"></svg>
              }
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-800">
                {{ pendingAction() === 'activate' ? 'Ativar Motorista' : 'Desativar Motorista' }}
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                @if (pendingAction() === 'activate') {
                  Deseja reativar o motorista? Ele ficará disponível para alocação em viagens.
                } @else {
                  Deseja desativar o cadastro do motorista? Ele não poderá ser escalado.
                }
              </p>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-left space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-slate-500">Motorista:</span>
                <span class="font-bold text-slate-800">{{ driver()?.name }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-500">CPF:</span>
                <span class="font-mono text-slate-700">{{ driver()?.cpf }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-500">Status Atual:</span>
                <span class="font-semibold">{{ getDriverStatusLabel(driver()!.status) }}</span>
              </div>
            </div>

            @if (errorMessage()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirm.emit()"
                [disabled]="isLoading()"
                [ngClass]="pendingAction() === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'"
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
