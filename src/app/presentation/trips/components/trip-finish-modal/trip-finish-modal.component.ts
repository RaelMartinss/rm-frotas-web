import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideCheckCircle2, LucideLoader2 } from '@lucide/angular';
import { Trip } from '../../../../domain/models/trip.model';

@Component({
  selector: 'app-trip-finish-modal',
  standalone: true,
  imports: [CommonModule, LucideCheckCircle2, LucideLoader2],
  template: `
    @if (trip(); as t) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="p-6 text-center space-y-4">
            <div class="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <svg lucideCheckCircle2 class="size-6"></svg>
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-800">Concluir Viagem?</h3>
              <p class="text-xs text-slate-500 mt-1">
                Deseja finalizar a viagem de <span class="font-semibold text-slate-700">{{ t.origin }}</span> para <span class="font-semibold text-slate-700">{{ t.destination }}</span>?
              </p>
              <div class="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-700 text-left">
                ℹ️ Ao concluir, a viagem passará para o status <strong>Concluída</strong> e o veículo <strong class="font-mono">{{ vehiclePlate() || t.vehiclePlate || 'veículo' }}</strong> será liberado para novas viagens.
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
                class="flex-1 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading()) {
                  <svg lucideLoader2 class="size-3.5 animate-spin"></svg>
                }
                Confirmar Conclusão
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class TripFinishModalComponent {
  readonly trip = input<Trip | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly vehiclePlate = input<string>('');

  readonly close = output<void>();
  readonly confirm = output<void>();
}
