import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideKeyRound,
  LucideLoader2
} from '@lucide/angular';
import { Driver, DriverStatus } from '../../../../domain/models/driver.model';

@Component({
  selector: 'app-driver-reset-password-modal',
  standalone: true,
  imports: [CommonModule, LucideKeyRound, LucideLoader2],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-2xs">
              <svg lucideKeyRound class="size-6"></svg>
            </div>

            <div>
              <h3 class="text-base font-bold text-white">Resetar Senha do Motorista</h3>
              <p class="text-xs text-[#8E9DA8] mt-1">
                Será gerada uma nova senha temporária para o motorista. No próximo login no aplicativo, o condutor será obrigado a cadastrar uma nova senha pessoal.
              </p>
            </div>

            <div class="p-4 bg-[#11161A] rounded-xl border border-[#222A2F] text-left space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">Motorista:</span>
                <span class="font-bold text-white">{{ driver()?.name }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">CPF:</span>
                <span class="font-mono text-[#8E9DA8]">{{ driver()?.cpf }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[#8E9DA8]">Status:</span>
                <span class="font-semibold text-white">{{ getDriverStatusLabel(driver()!.status) }}</span>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-end gap-3 border-t border-[#222A2F]">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="px-4 py-2.5 text-xs font-semibold text-[#8E9DA8] bg-[#171D21] hover:bg-[#222A2F] hover:text-white rounded-xl border border-[#222A2F] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirm.emit()"
                [disabled]="isLoading()"
                class="px-5 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Confirmar e Gerar Nova Senha
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DriverResetPasswordModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly isLoading = input<boolean>(false);

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
