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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div class="p-6 text-center space-y-4">
            <!-- Ícone Destaque -->
            <div class="size-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <svg lucideShieldCheck class="size-6"></svg>
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-900">{{ data()?.title || 'Credenciais de Acesso ao Aplicativo' }}</h3>
              <p class="text-xs text-slate-500 mt-1">
                Copie e envie a senha temporária para o motorista <strong class="text-slate-800">{{ data()?.userName }}</strong>.
              </p>
            </div>

            <!-- Box da Senha -->
            <div class="p-4 bg-slate-900 rounded-xl border border-slate-800 text-left space-y-2">
              <div class="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Senha Provisória</span>
                <span class="text-amber-400 flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Troca obrigatória no app
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 bg-slate-950/80 px-3.5 py-2.5 rounded-lg border border-slate-800">
                <span class="font-mono text-base font-bold text-emerald-400 tracking-wider select-all">
                  {{ data()?.temporaryPassword }}
                </span>
                <button
                  type="button"
                  (click)="copyPassword()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs shrink-0"
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

            <p class="text-[11px] text-slate-400">
              Por segurança, esta senha temporária não será exibida novamente nesta tela.
            </p>

            <div class="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                (click)="close.emit()"
                class="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
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
