import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucidePauseCircle,
  LucideX,
  LucideAlertTriangle,
  LucideLoader2
} from '@lucide/angular';
import { Driver, SuspensionReasonCategory } from '../../../../domain/models/driver.model';

export interface SuspendFormSubmitPayload {
  reasonCategory: SuspensionReasonCategory;
  reasonDetails?: string;
  indefinite: boolean;
  expectedReturnDate?: string;
  attachmentUrl?: string;
}

@Component({
  selector: 'app-driver-suspend-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucidePauseCircle,
    LucideX,
    LucideAlertTriangle,
    LucideLoader2
  ],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <div class="size-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200/60">
                <svg lucidePauseCircle class="size-4"></svg>
              </div>
              Suspender Motorista
            </h2>
            <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="suspendForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <svg lucideAlertTriangle class="size-4 text-rose-600 shrink-0 mt-0.5"></svg>
                <div class="flex-1">
                  <span class="font-bold block">Não foi possível suspender o condutor</span>
                  <span class="text-[11px] text-rose-700 mt-0.5 block">{{ errorMessage() }}</span>
                </div>
              </div>
            }

            <!-- Resumo do Motorista -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
              <div>
                <div class="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Condutor Selecionado</div>
                <div class="font-bold text-slate-800 text-sm mt-0.5">{{ driver()?.name }}</div>
                <div class="text-slate-500 font-mono text-[11px]">CPF: {{ driver()?.cpf }}</div>
              </div>
              <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px]">
                Status: Ativo
              </span>
            </div>

            <!-- Categoria do Motivo -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Motivo da Suspensão <span class="text-rose-500">*</span>
              </label>
              <select
                formControlName="reasonCategory"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium"
              >
                @for (opt of reasonOptions(); track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <!-- Detalhes da Justificativa -->
            @if (suspendForm.get('reasonCategory')?.value === 'OUTRO') {
              <div class="animate-in fade-in duration-150">
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa Detalhada <span class="text-rose-500">*</span>
                </label>
                <textarea
                  formControlName="reasonDetails"
                  rows="2"
                  placeholder="Descreva o motivo da suspensão..."
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder:text-slate-400"
                ></textarea>
              </div>
            } @else {
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Observações / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  formControlName="reasonDetails"
                  placeholder="Detalhes adicionais sobre a suspensão..."
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder:text-slate-400"
                />
              </div>
            }

            <!-- Toggle Prazo Indeterminado & Data Prevista -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  formControlName="indefinite"
                  class="rounded text-rose-600 focus:ring-rose-500 size-4"
                />
                <span class="text-xs font-semibold text-slate-700">Suspensão por tempo indeterminado (sem prazo definido)</span>
              </label>

              @if (!suspendForm.get('indefinite')?.value) {
                <div class="pt-1 animate-in fade-in duration-150">
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Data Prevista de Retorno <span class="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    formControlName="expectedReturnDate"
                    class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                  />
                </div>
              }
            </div>

            <!-- Anexo URL Opcional -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Link do Anexo / Documento (Opcional)
              </label>
              <input
                type="url"
                formControlName="attachmentUrl"
                placeholder="https://..."
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading()"
                class="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Confirmar Suspensão
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class DriverSuspendModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly reasonOptions = input<{ value: SuspensionReasonCategory; label: string }[]>([]);

  readonly close = output<void>();
  readonly confirm = output<SuspendFormSubmitPayload>();

  suspendForm: FormGroup = this.buildForm();

  constructor() {
    this.setupSubscribers();

    effect(() => {
      if (this.isOpen()) {
        this.suspendForm.reset({
          reasonCategory: 'ADMINISTRATIVO',
          indefinite: false,
          reasonDetails: '',
          expectedReturnDate: '',
          attachmentUrl: ''
        });
      }
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      reasonCategory: ['ADMINISTRATIVO', Validators.required],
      reasonDetails: [''],
      indefinite: [false],
      expectedReturnDate: [''],
      attachmentUrl: ['']
    });
  }

  private setupSubscribers(): void {
    this.suspendForm.get('reasonCategory')?.valueChanges.subscribe((cat) => {
      const detailsControl = this.suspendForm.get('reasonDetails');
      if (cat === 'OUTRO') {
        detailsControl?.setValidators(Validators.required);
      } else {
        detailsControl?.clearValidators();
      }
      detailsControl?.updateValueAndValidity();
    });

    this.suspendForm.get('indefinite')?.valueChanges.subscribe((indefinite) => {
      const returnControl = this.suspendForm.get('expectedReturnDate');
      if (indefinite) {
        returnControl?.clearValidators();
      } else {
        returnControl?.setValidators(Validators.required);
      }
      returnControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.suspendForm.invalid) {
      this.suspendForm.markAllAsTouched();
      return;
    }
    this.confirm.emit(this.suspendForm.value);
  }
}
