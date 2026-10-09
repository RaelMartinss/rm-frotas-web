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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- Header do Modal -->
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#0B0E11] shrink-0">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <svg lucideGauge class="size-5"></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Auditoria do Ciclo de Consumo</h3>
                <p class="text-[11px] text-[#8E9DA8]">Rastreabilidade e memória de cálculo entre tanques cheios</p>
              </div>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="p-1.5 text-[#8E9DA8] hover:text-white hover:bg-[#171D21] rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-4"></svg>
            </button>
          </div>

          <!-- Conteúdo com Scroll -->
          <div class="p-6 overflow-y-auto space-y-5 text-xs">
            <!-- Barra de Identificação do Veículo -->
            <div class="p-4 bg-[#11161A] rounded-2xl border border-[#222A2F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-[#171D21] border border-[#222A2F] text-[#8E9DA8] flex items-center justify-center shrink-0">
                  <svg lucideTruck class="size-5"></svg>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white font-mono text-sm">{{ cycle()!.vehiclePlate }}</span>
                    <span class="text-xs text-[#8E9DA8]">• {{ cycle()!.vehicleModel }}</span>
                  </div>
                  <span class="text-[11px] text-[#8E9DA8]">
                    Período: {{ cycle()!.startDate | date:'dd/MM/yyyy HH:mm' }} até {{ cycle()!.endDate | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-[#8E9DA8] font-semibold uppercase block">Resultado do Ciclo</span>
                <span class="text-lg font-black font-mono text-emerald-400">{{ cycle()!.kmPerLiter }} km/L</span>
              </div>
            </div>

            <!-- 1. Abastecimento Inicial -->
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-blue-500"></span>
                <h4 class="text-xs font-bold text-[#8E9DA8] uppercase tracking-wider">1. Abastecimento Inicial (Abertura do Ciclo)</h4>
              </div>
              <div class="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white font-mono">{{ cycle()!.startFueling.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Tanque Cheio Inicial</span>
                  </div>
                  <p class="text-[11px] text-[#8E9DA8] mt-1">
                    Posto: {{ cycle()!.startFueling.gasStation || 'Não informado' }}
                  </p>
                </div>
                <div class="text-right font-mono">
                  <span class="text-[10px] text-[#8E9DA8] block">Odômetro Inicial</span>
                  <span class="font-bold text-white">{{ cycle()!.startOdometer | number }} km</span>
                </div>
              </div>
              <p class="text-[11px] text-[#8E9DA8]/80 italic">
                * O volume abastecido neste registro encheu o reservatório antes do início do trajeto. O combustível medido neste ciclo começará a ser consumido a partir daqui.
              </p>
            </div>

            <!-- 2. Abastecimentos Intermediários (Parciais) se houver -->
            @if (cycle()!.intermediateFuelings.length > 0) {
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="size-2 rounded-full bg-amber-500"></span>
                  <h4 class="text-xs font-bold text-[#8E9DA8] uppercase tracking-wider">
                    2. Abastecimentos Intermediários ({{ cycle()!.intermediateFuelings.length }} parcial/ais acumulados)
                  </h4>
                </div>
                <div class="space-y-2">
                  @for (inter of cycle()!.intermediateFuelings; track inter.id; let idx = $index) {
                    <div class="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-white font-mono">{{ inter.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Parcial #{{ idx + 1 }}</span>
                        </div>
                        <span class="text-[11px] text-[#8E9DA8]">Posto: {{ inter.gasStation || 'Não informado' }}</span>
                      </div>
                      <div class="flex items-center gap-4 text-right font-mono text-xs">
                        <div>
                          <span class="text-[10px] text-[#8E9DA8] block">Odômetro</span>
                          <span class="font-semibold text-[#C5D1D9]">{{ inter.odometerAtFueling | number }} km</span>
                        </div>
                        <div>
                          <span class="text-[10px] text-[#8E9DA8] block">Volume</span>
                          <span class="font-bold text-amber-400">{{ inter.liters | number:'1.2-2' }} L</span>
                        </div>
                        <div>
                          <span class="text-[10px] text-[#8E9DA8] block">Valor</span>
                          <span class="font-semibold text-white">{{ inter.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
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
                <h4 class="text-xs font-bold text-[#8E9DA8] uppercase tracking-wider">
                  {{ cycle()!.intermediateFuelings.length > 0 ? '3' : '2' }}. Abastecimento Final (Fechamento do Ciclo)
                </h4>
              </div>
              <div class="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white font-mono">{{ cycle()!.closingFueling.fueledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Tanque Cheio Final</span>
                  </div>
                  <p class="text-[11px] text-[#8E9DA8] mt-1">
                    Posto: {{ cycle()!.closingFueling.gasStation || 'Não informado' }}
                  </p>
                </div>
                <div class="flex items-center gap-4 text-right font-mono text-xs">
                  <div>
                    <span class="text-[10px] text-[#8E9DA8] block">Odômetro Final</span>
                    <span class="font-bold text-white">{{ cycle()!.endOdometer | number }} km</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-[#8E9DA8] block">Volume Fechamento</span>
                    <span class="font-bold text-emerald-400">{{ cycle()!.closingFueling.liters | number:'1.2-2' }} L</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-[#8E9DA8] block">Valor</span>
                    <span class="font-semibold text-white">{{ cycle()!.closingFueling.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Memória de Cálculo Auditável (Seção 28 da Spec) -->
            <div class="p-4 bg-[#11161A] border border-[#222A2F] text-white rounded-2xl space-y-3">
              <div class="flex items-center gap-2 pb-2 border-b border-[#222A2F]">
                <svg lucideBarChart3 class="size-4 text-emerald-400"></svg>
                <span class="font-bold text-xs uppercase tracking-wider text-[#8E9DA8]">Memória de Cálculo (Fórmula Oficial)</span>
              </div>

              <div class="space-y-2 font-mono text-xs leading-relaxed">
                <!-- Distância -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-[#0F1215] rounded-xl border border-[#222A2F]">
                  <span class="text-[#8E9DA8]">Distância Percorrida:</span>
                  <span class="text-[#C5D1D9]">
                    {{ cycle()!.endOdometer | number }} - {{ cycle()!.startOdometer | number }} =
                    <strong class="text-emerald-400">{{ cycle()!.distanceKm | number }} km</strong>
                  </span>
                </div>

                <!-- Combustível Consumido -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-[#0F1215] rounded-xl border border-[#222A2F]">
                  <span class="text-[#8E9DA8]">Combustível Total Reposto:</span>
                  <span class="text-[#C5D1D9]">
                    @if (cycle()!.intermediateFuelings.length > 0) {
                      Parciais + Final =
                    }
                    <strong class="text-emerald-400">{{ cycle()!.fuelConsumed | number:'1.2-2' }} L</strong>
                  </span>
                </div>

                <!-- Eficiência Km/L -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-[#0F1215] rounded-xl border border-[#222A2F]">
                  <span class="text-[#8E9DA8]">Consumo Médio (Km / Litros):</span>
                  <span class="text-[#C5D1D9]">
                    {{ cycle()!.distanceKm | number }} km / {{ cycle()!.fuelConsumed | number:'1.2-2' }} L =
                    <strong class="text-emerald-400 text-sm">{{ cycle()!.kmPerLiter }} km/L</strong>
                  </span>
                </div>

                <!-- Custo por Km -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 bg-[#0F1215] rounded-xl border border-[#222A2F]">
                  <span class="text-[#8E9DA8]">Custo por Km Rodado:</span>
                  <span class="text-[#C5D1D9]">
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
                class="px-5 py-2.5 text-xs font-semibold text-white bg-[#171D21] hover:bg-[#222A2F] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
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
