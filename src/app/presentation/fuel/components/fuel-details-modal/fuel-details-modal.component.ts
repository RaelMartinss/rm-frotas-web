import { Component, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  LucideFuel,
  LucideX,
  LucideCamera,
  LucideExternalLink
} from '@lucide/angular';
import { FuelRecord } from '../../../../domain/models/fuel.model';

@Component({
  selector: 'app-fuel-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
    LucideFuel,
    LucideX,
    LucideCamera,
    LucideExternalLink
  ],
  template: `
    @if (isOpen() && record()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <svg lucideFuel class="size-5"></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">Detalhes do Abastecimento</h3>
                <p class="text-[11px] text-slate-400">Comprovante e dados da transação</p>
              </div>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-4"></svg>
            </button>
          </div>

          <div class="p-6 space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Veículo</span>
                <div class="font-bold text-slate-800 font-mono mt-0.5">{{ record()?.vehicle?.plate }}</div>
                <div class="text-[11px] text-slate-500">{{ record()?.vehicle?.brand }} {{ record()?.vehicle?.model }}</div>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Motorista</span>
                <div class="font-bold text-slate-800 mt-0.5">{{ record()?.driver?.name || 'Não informado' }}</div>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Volume Abastecido</span>
                <div class="font-bold text-slate-800 font-mono mt-0.5">{{ record()?.liters | number:'1.2-2' }} L</div>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Valor Total</span>
                <div class="font-bold text-emerald-700 font-mono mt-0.5">{{ record()?.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</div>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Odômetro no Registro</span>
                <div class="font-bold text-slate-800 font-mono mt-0.5">{{ record()?.odometerAtFueling | number }} km</div>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400">Posto de Combustível</span>
                <div class="font-bold text-slate-800 mt-0.5">{{ record()?.gasStation || 'Não informado' }}</div>
              </div>
            </div>

            @if (record()?.notes) {
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span class="text-[11px] text-slate-400 font-medium">Observações</span>
                <p class="text-slate-700 mt-0.5">{{ record()?.notes }}</p>
              </div>
            }

            <!-- Comprovante / Foto Anexada -->
            @if (record()?.receiptUrl) {
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-slate-700 font-bold flex items-center gap-1.5">
                    <svg lucideCamera class="size-3.5 text-emerald-600"></svg>
                    Foto do Cupom / Comprovante
                  </span>
                  <button
                    type="button"
                    (click)="openFullReceipt.emit(record()!.receiptUrl!)"
                    class="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Abrir Imagem Completa
                    <svg lucideExternalLink class="size-3"></svg>
                  </button>
                </div>
                <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-56 flex items-center justify-center p-1">
                  <img
                    [src]="record()?.receiptUrl"
                    alt="Comprovante de abastecimento"
                    class="max-h-52 w-auto object-contain rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                    (click)="openFullReceipt.emit(record()!.receiptUrl!)"
                  />
                </div>
              </div>
            }

            <div class="pt-2 flex justify-end">
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
export class FuelDetailsModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly record = input<FuelRecord | null>(null);

  readonly close = output<void>();
  readonly openFullReceipt = output<string>();
}
