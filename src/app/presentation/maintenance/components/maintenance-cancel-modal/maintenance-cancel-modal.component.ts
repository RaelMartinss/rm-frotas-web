import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Maintenance } from '../../../../domain/models/maintenance.model';
import {
  LucideAlertCircle,
  LucideBan,
  LucideLoader2,
} from '@lucide/angular';

@Component({
  selector: 'app-maintenance-cancel-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideBan,
    LucideAlertCircle,
    LucideLoader2,
  ],
  template: `
    @if (isOpen && maintenance) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <svg lucideBan class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Cancelar Manutenção</h3>
              <p class="text-xs text-slate-500 mt-1">
                Tem certeza que deseja cancelar esta ordem de serviço?
                @if (maintenance?.status === 'EM_ANDAMENTO') {
                  <span>O veículo <strong>{{ maintenance?.vehicle?.plate }}</strong> será liberado e voltará a ficar <strong>Disponível</strong>.</span>
                }
              </p>
            </div>

            <form [formGroup]="form">
              <div class="text-left">
                <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo do cancelamento (opcional)</label>
                <input
                  type="text"
                  formControlName="reason"
                  placeholder="Ex: Agendamento remarcado para outro mês..."
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            </form>

            @if (errorMessage) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs text-left">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isLoading"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                (click)="onConfirm()"
                [disabled]="isLoading"
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class MaintenanceCancelModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() maintenance: Maintenance | null = null;
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string | undefined>();

  form = this.fb.group({
    reason: new FormControl(''),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.form.reset({ reason: '' });
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit(this.form.value.reason?.trim() || undefined);
  }
}
