import { Component, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideIdCard,
  LucideX,
  LucideHistory,
  LucideMail,
  LucideAlertTriangle,
  LucideCheck,
  LucideLoader2,
  LucideFileText,
  LucidePlay,
  LucideFuel,
  LucideExternalLink,
  LucideKeyRound
} from '@lucide/angular';
import {
  Driver,
  DriverStatus,
  DriverSuspension,
  SuspensionReasonCategory,
  formatSuspensionReason
} from '../../../../domain/models/driver.model';

@Component({
  selector: 'app-driver-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    LucideIdCard,
    LucideX,
    LucideHistory,
    LucideMail,
    LucideAlertTriangle,
    LucideCheck,
    LucideLoader2,
    LucideFileText,
    LucidePlay,
    LucideFuel,
    LucideExternalLink,
    LucideKeyRound
  ],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <div class="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <svg lucideIdCard class="size-4"></svg>
              </div>
              Ficha do Condutor
            </h2>
            <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <!-- NAVEGAÇÃO POR ABAS -->
          <div class="flex border-b border-slate-200/80 px-6 bg-slate-50/40 shrink-0">
            <button
              type="button"
              (click)="detailsTab.set('info')"
              class="py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
              [ngClass]="detailsTab() === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
            >
              <svg lucideIdCard class="size-4"></svg>
              Informações Gerais
            </button>
            <button
              type="button"
              (click)="detailsTab.set('suspensions')"
              class="py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
              [ngClass]="detailsTab() === 'suspensions' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
            >
              <svg lucideHistory class="size-4"></svg>
              Histórico de Suspensões
              @if (suspensionHistory().length > 0) {
                <span class="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
                  {{ suspensionHistory().length }}
                </span>
              }
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-6 flex-1">
            <!-- ABA 1: INFORMAÇÕES GERAIS -->
            @if (detailsTab() === 'info') {
              <!-- HEADER COM AVATAR E DADOS PRINCIPAIS -->
              <div class="flex items-center gap-4">
                <div class="size-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl font-bold">
                  {{ driver()?.name?.charAt(0) || 'M' }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-800">{{ driver()?.name }}</h3>
                  @if (driver()?.email) {
                    <div class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                      <svg lucideMail class="size-3.5 text-indigo-500 shrink-0"></svg>
                      <span>{{ driver()?.email }}</span>
                    </div>
                  }
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border"
                      [ngClass]="getDriverStatusClass(driver()!.status)"
                    >
                      <span class="size-1.5 rounded-full" [ngClass]="getDriverStatusDotClass(driver()!.status)"></span>
                      {{ getDriverStatusLabel(driver()!.status) }}
                    </span>
                    @if (isSuspended(driver()!)) {
                      <button
                        type="button"
                        (click)="openLiftModal.emit(driver()!)"
                        class="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer ml-2"
                      >
                        Reativar Agora →
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- CARDS DE INFORMAÇÃO -->
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div class="text-[11px] text-slate-400 font-medium">CPF do Condutor</div>
                  <div class="text-sm font-bold text-slate-800 mt-0.5 font-mono">{{ driver()?.cpf }}</div>
                </div>

                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div class="text-[11px] text-slate-400 font-medium">Telefone / WhatsApp</div>
                  <div class="text-sm font-bold text-slate-800 mt-0.5">{{ driver()?.phone || 'Não informado' }}</div>
                </div>

                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 col-span-2">
                  <div class="text-[11px] text-slate-400 font-medium">E-mail de Acesso (App do Motorista)</div>
                  <div class="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                    <svg lucideMail class="size-4 text-indigo-500 shrink-0"></svg>
                    <span>{{ driver()?.email || 'Não informado' }}</span>
                  </div>
                </div>
              </div>

              <!-- CARTEIRA DE MOTORISTA (CNH) CARD -->
              <div class="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-2xl border border-indigo-100 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-indigo-950 uppercase tracking-wider">Carteira Nacional de Habilitação</span>
                  <span class="px-2 py-0.5 bg-indigo-600 text-white text-[11px] font-bold rounded-md shadow-2xs">
                    Cat. {{ getCnhCategory(driver()!) }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span class="text-[10px] text-slate-400 block font-medium">Nº DO REGISTRO</span>
                    <span class="font-mono font-bold text-slate-800 text-sm">{{ getCnhNumber(driver()!) }}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 block font-medium">VALIDADE</span>
                    <span class="font-bold text-slate-800 text-sm">
                      {{ (getCnhExpiration(driver()!) | date:'dd/MM/yyyy') || 'Não informada' }}
                    </span>
                  </div>
                </div>

                <div class="pt-2 border-t border-indigo-100 flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs">
                    @if (isCnhExpired(getCnhExpiration(driver()!))) {
                      <span class="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px] border border-rose-200 flex items-center gap-1">
                        <svg lucideAlertTriangle class="size-3"></svg>
                        CNH Vencida
                      </span>
                    } @else if (isCnhExpiringSoon(getCnhExpiration(driver()!))) {
                      <span class="px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded text-[10px] border border-amber-200 flex items-center gap-1">
                        <svg lucideAlertTriangle class="size-3"></svg>
                        Vencimento Próximo
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded text-[10px] border border-emerald-200 flex items-center gap-1">
                        <svg lucideCheck class="size-3"></svg>
                        Habilitação Regular
                      </span>
                    }
                  </div>

                  <button
                    type="button"
                    (click)="openUpdateCnhModal.emit(driver()!)"
                    class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Renovar CNH →
                  </button>
                </div>
              </div>
            }

            <!-- ABA 2: HISTÓRICO DE SUSPENSÕES -->
            @if (detailsTab() === 'suspensions') {
              <div class="space-y-4">
                @if (loadingSuspensions()) {
                  <div class="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <svg lucideLoader2 class="size-6 animate-spin text-rose-600"></svg>
                    <span class="text-xs font-medium">Carregando histórico de suspensões...</span>
                  </div>
                } @else if (suspensionHistory().length === 0) {
                  <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                    <div class="size-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <svg lucideCheck class="size-5"></svg>
                    </div>
                    <h4 class="text-xs font-bold text-slate-800">Nenhuma suspensão registrada</h4>
                    <p class="text-[11px] text-slate-500">Este condutor não possui eventos de suspensão no histórico.</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (susp of suspensionHistory(); track susp.id) {
                      <div
                        class="p-4 rounded-xl border text-xs space-y-2.5 transition-all"
                        [ngClass]="susp.status === 'ATIVA' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200/80'"
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span
                              class="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                              [ngClass]="susp.status === 'ATIVA' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300'"
                            >
                              {{ susp.status === 'ATIVA' ? 'SUSPENSÃO ATIVA' : 'ENCERRADA' }}
                            </span>
                            <span class="font-bold text-slate-800">{{ formatSuspensionReason(susp.reasonCategory) }}</span>
                          </div>
                          <span class="text-[10px] text-slate-400">
                            {{ susp.suspendedAt | date:'dd/MM/yyyy HH:mm' }}
                          </span>
                        </div>

                        @if (susp.reasonDetails) {
                          <div class="text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/50 text-[11px]">
                            <strong class="text-slate-700">Justificativa:</strong> {{ susp.reasonDetails }}
                          </div>
                        }

                        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                          <div>
                            <span class="text-slate-400 block text-[10px]">PREVISÃO DE RETORNO</span>
                            <span class="font-medium text-slate-800">
                              {{ susp.indefinite ? 'Sem prazo definido' : ((susp.expectedReturnDate | date:'dd/MM/yyyy') || 'Não informada') }}
                            </span>
                          </div>
                          @if (susp.liftedAt) {
                            <div>
                              <span class="text-slate-400 block text-[10px]">ENCERRADA EM</span>
                              <span class="font-medium text-emerald-700">
                                {{ susp.liftedAt | date:'dd/MM/yyyy HH:mm' }}
                              </span>
                            </div>
                          }
                        </div>

                        @if (susp.liftReason) {
                          <div class="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/50">
                            <strong class="text-emerald-900">Motivo do Encerramento:</strong> {{ susp.liftReason }}
                          </div>
                        }

                        @if (susp.attachmentUrl) {
                          <div class="pt-1">
                            <a
                              [href]="susp.attachmentUrl"
                              target="_blank"
                              class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              <svg lucideFileText class="size-3.5"></svg>
                              Ver Documento Anexo ↗
                            </a>
                          </div>
                        }

                        @if (susp.status === 'ATIVA') {
                          <div class="pt-2 border-t border-rose-200 flex justify-end">
                            <button
                              type="button"
                              (click)="openLiftModal.emit(driver()!)"
                              class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <svg lucidePlay class="size-3.5"></svg>
                              Reativar Condutor
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <div class="pt-2 flex items-center justify-between border-t border-slate-100 gap-2 flex-wrap">
              <div class="flex items-center gap-3">
                <a
                  [routerLink]="['/abastecimentos']"
                  [queryParams]="{ driverId: driver()?.id }"
                  (click)="close.emit()"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  <svg lucideFuel class="size-4"></svg>
                  <span>Abastecimentos</span>
                  <svg lucideExternalLink class="size-3.5"></svg>
                </a>

                @if (driver()) {
                  <button
                    type="button"
                    (click)="openResetPasswordModal.emit(driver()!)"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    <svg lucideKeyRound class="size-4"></svg>
                    <span>Resetar Senha de Acesso</span>
                  </button>
                }
              </div>

              <button
                type="button"
                (click)="close.emit()"
                class="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
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
export class DriverDetailsModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly suspensionHistory = input<DriverSuspension[]>([]);
  readonly loadingSuspensions = input<boolean>(false);

  readonly close = output<void>();
  readonly openLiftModal = output<Driver>();
  readonly openUpdateCnhModal = output<Driver>();
  readonly openResetPasswordModal = output<Driver>();

  readonly detailsTab = signal<'info' | 'suspensions'>('info');

  getDriverStatusClass(status: DriverStatus): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EM_VIAGEM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  }

  getDriverStatusDotClass(status: DriverStatus): string {
    switch (status) {
      case 'ACTIVE':
      case 'DISPONIVEL':
        return 'bg-emerald-500';
      case 'EM_VIAGEM':
        return 'bg-blue-500';
      case 'INACTIVE':
      case 'FOLGA':
        return 'bg-slate-400';
      case 'SUSPENDED':
      case 'AFASTADO':
      default:
        return 'bg-rose-500';
    }
  }

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

  isSuspended(driver: Driver): boolean {
    return driver.status === 'SUSPENDED' || driver.status === 'AFASTADO';
  }

  getCnhCategory(driver: Driver): string {
    return driver.cnh?.category || driver.cnhCategory || 'B';
  }

  getCnhNumber(driver: Driver): string {
    return driver.cnh?.number || driver.cnhNumber || 'Não informado';
  }

  getCnhExpiration(driver: Driver): string | null {
    return driver.cnh?.expirationDate || driver.cnhExpiration || null;
  }

  isCnhExpired(date: string | null): boolean {
    if (!date) return false;
    const expirationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expirationDate < today;
  }

  isCnhExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const expirationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  readonly formatSuspensionReason = formatSuspensionReason;
}
