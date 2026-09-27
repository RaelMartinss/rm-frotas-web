import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideBan, LucideLoader2 } from '@lucide/angular';
import { Trip } from '../../../../domain/models/trip.model';

@Component({
  selector: 'app-trip-cancel-modal',
  standalone: true,
  imports: [CommonModule, LucideBan, LucideLoader2],
  template: `
    @if (trip(); as t) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <svg lucideBan class="size-6"></svg>
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-800">Cancelar Viagem?</h3>
              <p class="text-xs text-slate-500 mt-1">
                Tem certeza que deseja cancelar a rota de <span class="font-semibold text-slate-700">{{ t.origin }}</span> para <span class="font-semibold text-slate-700">{{ t.destination }}</span>?
              </p>
              <div class="mt-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-[11px] text-rose-700 text-left">
                ⚠️ Esta ação cancelará o agendamento e o veículo <strong class="font-mono">{{ vehiclePlate() || t.vehiclePlate || 'veículo' }}</strong> voltará a ficar disponível imediatamente.
              </div>
            </div>

            <div class="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                (click)="close.emit()"
                class="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                (click)="confirm.emit()"
                [disabled]="isLoading()"
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-3.5 animate-spin"></svg>
                }
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class TripCancelModalComponent {
  readonly trip = input<Trip | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly vehiclePlate = input<string>('');

  readonly close = output<void>();
  readonly confirm = output<void>();
}
