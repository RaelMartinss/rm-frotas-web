import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InactivityGuardService } from '../../../core/services/inactivity-guard.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { IAuthRepository } from '../../../domain/repositories/auth.repository.interface';
import { formatUserRole } from '../../../domain/models/user.model';

@Component({
  selector: 'app-session-lock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <div
        class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl text-slate-100 flex flex-col items-center text-center relative overflow-hidden"
      >
        <!-- Detalhe superior em gradiente esmeralda -->
        <div
          class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
        ></div>

        <!-- Ícone / Avatar -->
        <div class="relative mb-5 mt-2">
          <div
            class="w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shadow-inner"
          >
            @if (currentUser()?.name) {
              {{ getInitials(currentUser()?.name) }}
            } @else {
              <svg
                class="w-10 h-10 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          </div>
          <!-- Badge de Cadeado -->
          <div
            class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow"
          >
            <svg
              class="w-3.5 h-3.5 text-slate-950"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <!-- Título e Identificação -->
        <h2 class="text-xl font-bold tracking-tight text-white mb-1">
          Sessão Bloqueada
        </h2>
        <p class="text-sm text-slate-400 mb-1">
          Olá, <span class="text-slate-200 font-medium">{{ currentUser()?.name || 'Gestor' }}</span>
        </p>
        <span
          class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6"
        >
          {{ formatRole(currentUser()?.role) }}
        </span>

        <p class="text-xs text-slate-400 mb-5 leading-relaxed max-w-xs">
          Sua sessão foi bloqueada temporariamente por inatividade. Confirme sua senha para continuar.
        </p>

        <!-- Formulário de Desbloqueio -->
        <form (ngSubmit)="onUnlock()" class="w-full space-y-4">
          <div class="relative text-left">
            <label class="block text-xs font-medium text-slate-300 mb-1.5">
              Senha de Acesso
            </label>
            <div class="relative">
              <input
                #passwordInput
                [type]="showPassword() ? 'text' : 'password'"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
                name="lockPassword"
                required
                autocomplete="current-password"
                placeholder="Digite sua senha"
                class="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition"
              />
              <button
                type="button"
                (click)="toggleShowPassword()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
                tabindex="-1"
                aria-label="Alternar visualização da senha"
              >
                @if (showPassword()) {
                  <!-- Eye Off -->
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                } @else {
                  <!-- Eye -->
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <!-- Mensagem de Erro -->
          @if (errorMessage()) {
            <div
              class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left flex items-start gap-2 animate-in fade-in"
            >
              <svg class="w-4 h-4 shrink-0 mt-0.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Botão Desbloquear -->
          <button
            type="submit"
            [disabled]="isLoading() || !password()"
            class="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Verificando...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span>Desbloquear Sessão</span>
            }
          </button>
        </form>

        <!-- Link Discreto de Logout -->
        <div class="mt-6 pt-4 border-t border-slate-800/80 w-full">
          <button
            type="button"
            (click)="onLogout()"
            class="text-xs text-slate-400 hover:text-rose-400 transition inline-flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Não é você? Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SessionLockModalComponent implements AfterViewInit {
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;

  private readonly inactivityGuard = inject(InactivityGuardService);
  private readonly authState = inject(AuthStateService);
  private readonly authRepository = inject(IAuthRepository);
  private readonly router = inject(Router);

  readonly currentUser = this.authState.currentUser;
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.passwordInput?.nativeElement?.focus();
    }, 100);
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  formatRole(role?: string | null): string {
    return formatUserRole(role);
  }

  getInitials(name?: string | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onUnlock(): void {
    const pwd = this.password().trim();
    if (!pwd || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authRepository.verifyPassword(pwd).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.valid) {
          this.password.set('');
          this.inactivityGuard.unlock();
        } else {
          this.errorMessage.set('Senha incorreta. Tente novamente.');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          'Erro ao verificar a senha. Verifique sua conexão e tente novamente.',
        );
      },
    });
  }

  onLogout(): void {
    this.inactivityGuard.stop();
    this.authRepository.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
