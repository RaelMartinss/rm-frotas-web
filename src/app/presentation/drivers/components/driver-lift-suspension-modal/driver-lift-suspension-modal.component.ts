import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  LucideUserCheck,
  LucideX,
  LucideAlertCircle,
  LucideLoader2
} from '@lucide/angular';
import { Driver } from '../../../../domain/models/driver.model';

@Component({
  selector: 'app-driver-lift-suspension-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUserCheck,
    LucideX,
    LucideAlertCircle,
    LucideLoader2
  ],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <div class="size-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <svg lucideUserCheck class="size-4"></svg>
              </div>
              Reativar Condutor
            </h2>
            <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="liftForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

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
                <span class="font-semibold text-rose-600">Suspenso</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Motivo do Encerramento / Justificativa (Opcional)
              </label>
              <textarea
                formControlName="liftReason"
                rows="2"
                placeholder="Ex: CNH renovada e apresentada, processo concluído..."
                class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              ></textarea>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Reativar Condutor
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class DriverLiftSuspensionModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly close = output<void>();
  readonly confirm = output<{ liftReason?: string }>();

  liftForm: FormGroup = this.fb.group({
    liftReason: ['']
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.liftForm.reset({ liftReason: '' });
      }
    });
  }

  onSubmit(): void {
    this.confirm.emit({
      liftReason: this.liftForm.value.liftReason || undefined
    });
  }
}
