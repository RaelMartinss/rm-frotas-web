import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideShieldCheck,
  LucideCopy,
  LucideCheck
} from '@lucide/angular';

export interface TempPasswordModalData {
  title?: string;
  userName: string;
  temporaryPassword?: string;
}

@Component({
  selector: 'app-driver-temp-password-modal',
  standalone: true,
  imports: [CommonModule, LucideShieldCheck, LucideCopy, LucideCheck],
  template: `
    @if (isOpen() && data()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div class="p-6 text-center space-y-4">
            <!-- Ícone Destaque -->
            <div class="size-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-2xs">
              <svg lucideShieldCheck class="size-6"></svg>
            </div>

            <div>
              <h3 class="text-base font-bold text-white">{{ data()?.title || 'Credenciais de Acesso ao Aplicativo' }}</h3>
              <p class="text-xs text-[#8E9DA8] mt-1">
                Copie e envie a senha temporária para o motorista <strong class="text-white">{{ data()?.userName }}</strong>.
              </p>
            </div>

            <!-- Box da Senha -->
            <div class="p-4 bg-[#11161A] rounded-xl border border-[#222A2F] text-left space-y-2">
              <div class="flex items-center justify-between text-[11px] text-[#8E9DA8] font-medium">
                <span>Senha Provisória</span>
                <span class="text-amber-400 flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Troca obrigatória no app
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 bg-[#0B0E11] px-3.5 py-2.5 rounded-lg border border-[#222A2F]">
                <span class="font-mono text-base font-bold text-[#FF6B00] tracking-wider select-all">
                  {{ data()?.temporaryPassword }}
                </span>
                <button
                  type="button"
                  (click)="copyPassword()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF6B00] hover:bg-[#E05D00] text-[#080B0C] transition-all cursor-pointer shadow-xs shrink-0"
                  title="Copiar senha para área de transferência"
                >
                  @if (copied()) {
                    <svg lucideCheck class="size-3.5"></svg>
                    <span>Copiado!</span>
                  } @else {
                    <svg lucideCopy class="size-3.5"></svg>
                    <span>Copiar</span>
                  }
                </button>
              </div>
            </div>

            <p class="text-[11px] text-[#8E9DA8]/60">
              Por segurança, esta senha temporária não será exibida novamente nesta tela.
            </p>

            <div class="pt-2 border-t border-[#222A2F] flex justify-end">
              <button
                type="button"
                (click)="close.emit()"
                class="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Entendido, já guardei a senha
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class DriverTempPasswordModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly data = input<TempPasswordModalData | null>(null);

  readonly close = output<void>();

  readonly copied = signal(false);

  copyPassword(): void {
    const pwd = this.data()?.temporaryPassword;
    if (!pwd) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
