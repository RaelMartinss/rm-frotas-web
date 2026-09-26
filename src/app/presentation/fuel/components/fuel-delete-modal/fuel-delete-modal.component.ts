import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { LucideTrash2, LucideLoader2 } from '@lucide/angular';
import { FuelRecord } from '../../../../domain/models/fuel.model';

@Component({
  selector: 'app-fuel-delete-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, LucideTrash2, LucideLoader2],
  template: `
    @if (isOpen() && record()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <svg lucideTrash2 class="size-6"></svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Excluir Abastecimento</h3>
              <p class="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
            </div>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            Tem certeza que deseja excluir o abastecimento de
            <strong class="text-slate-800 font-mono">{{ record()?.liters | number:'1.2-2' }} L</strong>
            do veículo <strong class="text-slate-800 font-mono">{{ record()?.vehicle?.plate }}</strong> realizado em
            <strong class="text-slate-800">{{ record()?.fueledAt | date:'dd/MM/yyyy' }}</strong>?
          </p>

          <div class="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="cancel.emit()"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirm.emit()"
              [disabled]="isSubmitting()"
              class="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              @if (isSubmitting()) {
                <svg lucideLoader2 class="size-4 animate-spin"></svg>
                <span>Excluindo...</span>
              } @else {
                <span>Confirmar Exclusão</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class FuelDeleteModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly record = input<FuelRecord | null>(null);
  readonly isSubmitting = input<boolean>(false);

  readonly cancel = output<void>();
  readonly confirm = output<void>();
}
