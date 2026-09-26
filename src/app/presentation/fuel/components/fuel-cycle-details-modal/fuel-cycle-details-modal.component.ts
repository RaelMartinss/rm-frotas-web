import { Component, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  LucideGauge,
  LucideX,
  LucideTruck,
  LucideBarChart3
} from '@lucide/angular';
import { FuelConsumptionCycle } from '../../../../domain/models/fuel.model';

@Component({
  selector: 'app-fuel-cycle-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    LucideGauge,
    LucideX,
    LucideTruck,
    LucideBarChart3
  ],
  template: `
    @if (isOpen() && cycle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- Header do Modal -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <svg lucideGauge class="size-5"></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">Auditoria do Ciclo de Consumo</h3>
                <p class="text-[11px] text-slate-400">Rastreabilidade e memória de cálculo entre tanques cheios</p>
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

          <!-- Conteúdo com Scroll -->
          <div class="p-6 overflow-y-auto space-y-5 text-xs">
            <!-- Barra de Identificação do Veículo -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <svg lucideTruck class="size-5"></svg>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 font-mono text-sm">{{ cycle()!.vehiclePlate }}</span>
                    <span class="text-xs text-slate-500">• {{ cycle()!.vehicleModel }}</span>
                  </div>
                  <span class="text-[11px] text-slate-400">
                    Período: {{ cycle()!.startDate | date:'dd/MM/yyyy HH:mm' }} até {{ cycle()!.endDate | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 font-semibold uppercase block">Resultado do Ciclo</span>
                <span class="text-lg font-black font-mono text-emerald-600">{{ cycle()!.kmPerLiter }} km/L</span>
              </div>
            </div>

            <!-- 1. Abastecimento Inicial -->
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-blue-500"></span>
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Abastecimento Inicial (Abertura do Ciclo)</h4>
              </div>
              <div class="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 font-mono">{{ cycle()!.startFueling.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Tanque Cheio Inicial</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-1">
                    Posto: {{ cycle()!.startFueling.gasStation || 'Não informado' }}
                  </p>
                </div>
                <div class="text-right font-mono">
                  <span class="text-[10px] text-slate-400 block">Odômetro Inicial</span>
                  <span class="font-bold text-slate-800">{{ cycle()!.startOdometer | number }} km</span>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 italic">
                * O volume abastecido neste registro encheu o reservatório antes do início do trajeto. O combustível medido neste ciclo começará a ser consumido a partir daqui.
              </p>
            </div>

            <!-- 2. Abastecimentos Intermediários (Parciais) se houver -->
            @if (cycle()!.intermediateFuelings.length > 0) {
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="size-2 rounded-full bg-amber-500"></span>
                  <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Abastecimentos Intermediários ({{ cycle()!.intermediateFuelings.length }} parcial/ais acumulados)
                  </h4>
                </div>
                <div class="space-y-2">
                  @for (inter of cycle()!.intermediateFuelings; track inter.id; let idx = $index) {
                    <div class="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-800 font-mono">{{ inter.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Parcial #{{ idx + 1 }}</span>
                        </div>
                        <span class="text-[11px] text-slate-500">Posto: {{ inter.gasStation || 'Não informado' }}</span>
                      </div>
                      <div class="flex items-center gap-4 text-right font-mono text-xs">
                        <div>
                          <span class="text-[10px] text-slate-400 block">Odômetro</span>
                          <span class="font-semibold text-slate-700">{{ inter.odometerAtFueling | number }} km</span>
                        </div>
                        <div>
                          <span class="text-[10px] text-slate-400 block">Volume</span>
                          <span class="font-bold text-amber-700">{{ inter.liters | number:'1.2-2' }} L</span>
                        </div>
                        <div>
                          <span class="text-[10px] text-slate-400 block">Valor</span>
                          <span class="font-semibold text-slate-800">{{ inter.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- 3. Abastecimento Final (Fechamento do Ciclo) -->
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-emerald-500"></span>
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {{ cycle()!.intermediateFuelings.length > 0 ? '3' : '2' }}. Abastecimento Final (Fechamento do Ciclo)
                </h4>
              </div>
              <div class="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 font-mono">{{ cycle()!.closingFueling.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Tanque Cheio Final</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-1">
                    Posto: {{ cycle()!.closingFueling.gasStation || 'Não informado' }}
                  </p>
                </div>
                <div class="flex items-center gap-4 text-right font-mono text-xs">
                  <div>
                    <span class="text-[10px] text-slate-400 block">Odômetro Final</span>
                    <span class="font-bold text-slate-800">{{ cycle()!.endOdometer | number }} km</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 block">Volume Fechamento</span>
                    <span class="font-bold text-emerald-700">{{ cycle()!.closingFueling.liters | number:'1.2-2' }} L</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 block">Valor</span>
                    <span class="font-semibold text-slate-800">{{ cycle()!.closingFueling.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Memória de Cálculo Auditável (Seção 28 da Spec) -->
            <div class="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-3">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-800">
                <svg lucideBarChart3 class="size-4 text-emerald-400"></svg>
                <span class="font-bold text-xs uppercase tracking-wider text-slate-300">Memória de Cálculo (Fórmula Oficial)</span>
              </div>

              <div class="space-y-2 font-mono text-xs leading-relaxed">
                <!-- Distância -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-800/60 rounded-xl">
                  <span class="text-slate-400">Distância Percorrida:</span>
                  <span class="text-slate-200">
                    {{ cycle()!.endOdometer | number }} - {{ cycle()!.startOdometer | number }} =
                    <strong class="text-emerald-400">{{ cycle()!.distanceKm | number }} km</strong>
                  </span>
                </div>

                <!-- Combustível Consumido -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-800/60 rounded-xl">
                  <span class="text-slate-400">Combustível Total Reposto:</span>
                  <span class="text-slate-200">
                    @if (cycle()!.intermediateFuelings.length > 0) {
                      Parciais + Final =
                    }
                    <strong class="text-emerald-400">{{ cycle()!.fuelConsumed | number:'1.2-2' }} L</strong>
                  </span>
                </div>

                <!-- Eficiência Km/L -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-800/60 rounded-xl">
                  <span class="text-slate-400">Consumo Médio (Km / Litros):</span>
                  <span class="text-slate-200">
                    {{ cycle()!.distanceKm | number }} km / {{ cycle()!.fuelConsumed | number:'1.2-2' }} L =
                    <strong class="text-emerald-400 text-sm">{{ cycle()!.kmPerLiter }} km/L</strong>
                  </span>
                </div>

                <!-- Custo por Km -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-slate-800/60 rounded-xl">
                  <span class="text-slate-400">Custo por Km Rodado:</span>
                  <span class="text-slate-200">
                    {{ cycle()!.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }} / {{ cycle()!.distanceKm | number }} km =
                    <strong class="text-amber-400">{{ cycle()!.costPerKm | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}/km</strong>
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                type="button"
                (click)="close.emit()"
                class="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class FuelCycleDetailsModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly cycle = input<FuelConsumptionCycle | null>(null);

  readonly close = output<void>();
}
