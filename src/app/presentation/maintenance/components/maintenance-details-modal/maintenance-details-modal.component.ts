import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Maintenance, MaintenanceStatus, MaintenanceType } from '../../../../domain/models/maintenance.model';
import {
  LucideWrench,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-maintenance-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucideWrench,
    LucideX,
  ],
  template: `
    @if (isOpen && maintenance) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <div class="size-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                <svg lucideWrench class="size-4"></svg>
              </div>
              Detalhes da Manutenção
            </h2>
            <button
              type="button"
              (click)="onClose()"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-4">
            <!-- Resumo do Veículo e Status -->
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div class="font-extrabold text-base text-slate-900">{{ maintenance?.vehicle?.plate }}</div>
                <div class="text-xs text-slate-500">{{ maintenance?.vehicle?.brand }} {{ maintenance?.vehicle?.model }}</div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span
                  class="px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1.5 border"
                  [ngClass]="getStatusClass(maintenance!.status)"
                >
                  <span class="size-1.5 rounded-full" [ngClass]="getStatusDotClass(maintenance!.status)"></span>
                  {{ getStatusLabel(maintenance!.status) }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  [ngClass]="getTypeClass(maintenance!.type)"
                >
                  {{ getTypeLabel(maintenance!.type) }}
                </span>
              </div>
            </div>

            <!-- Dados Principais -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[11px] text-slate-400">Oficina / Prestador</span>
                <div class="font-semibold text-slate-800 mt-0.5">{{ maintenance?.serviceProvider || 'Não informado' }}</div>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[11px] text-slate-400">Odômetro no Serviço</span>
                <div class="font-semibold text-slate-800 mt-0.5">
                  {{ (maintenance?.odometerAtService | number) ? (maintenance?.odometerAtService | number) + ' km' : 'Não registrado' }}
                </div>
              </div>
            </div>

            <!-- Descrição -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Descrição / Motivo</span>
              <p class="text-slate-800 mt-1 whitespace-pre-wrap">{{ maintenance?.description }}</p>
            </div>

            <!-- Peças e Serviços -->
            @if (maintenance?.items && maintenance!.items!.length > 0) {
              <div>
                <h4 class="text-xs font-bold text-slate-800 mb-2">Itens / Serviços Detalhados</h4>
                <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  @for (item of maintenance!.items!; track item.id || $index) {
                    <div class="p-2.5 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span class="font-medium text-slate-800">{{ item.name }}</span>
                        <span class="text-slate-400 text-[11px] ml-1.5">({{ item.quantity }}x)</span>
                      </div>
                      <span class="font-semibold text-slate-700">
                        {{ (item.cost * (item.quantity || 1)) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Total -->
            <div class="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-950">Valor Total da Manutenção:</span>
              <span class="text-lg font-extrabold text-emerald-800">
                {{ maintenance?.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                type="button"
                (click)="onClose()"
                class="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class MaintenanceDetailsModalComponent {
  @Input() isOpen = false;
  @Input() maintenance: Maintenance | null = null;

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  getStatusLabel(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'Agendada';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'CONCLUIDA':
        return 'Concluída';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return status;
    }
  }

  getStatusClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'EM_ANDAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'CANCELADA':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getStatusDotClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-500';
      case 'EM_ANDAMENTO':
        return 'bg-amber-500 animate-pulse';
      case 'CONCLUIDA':
        return 'bg-emerald-500';
      case 'CANCELADA':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  }

  getTypeLabel(type: MaintenanceType): string {
    return type === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva';
  }

  getTypeClass(type: MaintenanceType): string {
    return type === 'PREVENTIVA'
      ? 'bg-purple-50 text-purple-700 border-purple-200/60'
      : 'bg-rose-50 text-rose-700 border-rose-200/60';
  }
}
