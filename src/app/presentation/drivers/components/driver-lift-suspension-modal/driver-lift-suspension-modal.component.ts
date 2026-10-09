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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11]">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <div class="size-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <svg lucideUserCheck class="size-4"></svg>
              </div>
              Reativar Condutor
            </h2>
            <button (click)="close.emit()" class="text-[#8E9DA8] hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="liftForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

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
                <span class="font-semibold text-rose-400">Suspenso</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
                Motivo do Encerramento / Justificativa (Opcional)
              </label>
              <textarea
                formControlName="liftReason"
                rows="2"
                placeholder="Ex: CNH renovada e apresentada, processo concluído..."
                class="w-full bg-[#11161A] border border-[#222A2F] rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all placeholder:text-[#8E9DA8]/40"
              ></textarea>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-[#8E9DA8] bg-[#171D21] hover:bg-[#222A2F] hover:text-white rounded-xl border border-[#222A2F] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
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
