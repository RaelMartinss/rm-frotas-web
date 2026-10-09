import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideIdCard,
  LucideX,
  LucideAlertCircle,
  LucideLoader2
} from '@lucide/angular';
import { Driver } from '../../../../domain/models/driver.model';
import { CnhMaskDirective } from '../../../shared/directives/input-mask.directives';

export interface UpdateCnhSubmitPayload {
  cnhNumber: string;
  cnhCategory: string;
  cnhExpirationDate: string;
}

@Component({
  selector: 'app-driver-update-cnh-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CnhMaskDirective,
    LucideIdCard,
    LucideX,
    LucideAlertCircle,
    LucideLoader2
  ],
  template: `
    @if (isOpen() && driver()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11]">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <div class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20">
                <svg lucideIdCard class="size-4"></svg>
              </div>
              Atualizar / Renovar CNH
            </h2>
            <button (click)="close.emit()" class="text-[#8E9DA8] hover:text-white hover:bg-[#171D21] p-1.5 rounded-lg transition-colors cursor-pointer">
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="updateCnhForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
            @if (errorMessage()) {
              <div class="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] space-y-1.5 text-xs">
              <div class="text-[#8E9DA8] text-[11px]">Condutor selecionado:</div>
              <div class="font-bold text-white">{{ driver()?.name }}</div>
              <div class="text-[#8E9DA8]">CPF: <span class="font-mono font-semibold text-white">{{ driver()?.cpf }}</span></div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
                  Número da CNH <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  appCnhMask
                  formControlName="cnhNumber"
                  placeholder="12345678900"
                  class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-[#FF6B00] transition-all placeholder:font-sans placeholder:text-[#62707C]"
                  [ngClass]="(updateCnhForm.get('cnhNumber')?.invalid && updateCnhForm.get('cnhNumber')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
                  Categoria <span class="text-rose-400">*</span>
                </label>
                <select
                  formControlName="cnhCategory"
                  class="w-full bg-[#11161A] border border-[#222A2F] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all [&>option]:bg-[#11161A] [&>option]:text-white"
                >
                  @for (cat of cnhCategories(); track cat) {
                    <option [value]="cat">Cat. {{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
                Nova Data de Vencimento <span class="text-rose-400">*</span>
              </label>
              <input
                type="date"
                formControlName="cnhExpirationDate"
                class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all"
                [ngClass]="(updateCnhForm.get('cnhExpirationDate')?.invalid && updateCnhForm.get('cnhExpirationDate')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
              />
            </div>

            <div class="pt-4 border-t border-[#222A2F] flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="close.emit()"
                [disabled]="isLoading()"
                class="px-4 py-2 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading()"
                class="px-5 py-2 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Salvar CNH
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class DriverUpdateCnhModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly isOpen = input<boolean>(false);
  readonly driver = input<Driver | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly cnhCategories = input<string[]>(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']);

  readonly close = output<void>();
  readonly confirm = output<UpdateCnhSubmitPayload>();

  updateCnhForm: FormGroup = this.buildForm();

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const d = this.driver();
      if (open && d) {
        this.updateCnhForm.reset({
          cnhNumber: d.cnhNumber,
          cnhCategory: d.cnhCategory,
          cnhExpirationDate: d.cnhExpiration ? d.cnhExpiration.slice(0, 10) : ''
        });
      }
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      cnhNumber: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      cnhCategory: ['B', Validators.required],
      cnhExpirationDate: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.updateCnhForm.invalid) {
      this.updateCnhForm.markAllAsTouched();
      return;
    }
    this.confirm.emit(this.updateCnhForm.value);
  }
}
