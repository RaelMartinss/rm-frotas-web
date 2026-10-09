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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-[#222A2F] flex items-center justify-between bg-[#11161A] shrink-0">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <div class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20">
                <svg lucideWrench class="size-4"></svg>
              </div>
              Detalhes da Manutenção
            </h2>
            <button
              type="button"
              (click)="onClose()"
              class="text-[#8E9DA8] hover:text-white hover:bg-[#171D21] p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-4">
            <!-- Resumo do Veículo e Status -->
            <div class="flex items-center justify-between p-4 bg-[#11161A] rounded-xl border border-[#222A2F]">
              <div>
                <div class="font-extrabold text-base text-white font-mono">{{ maintenance?.vehicle?.plate }}</div>
                <div class="text-xs text-[#8E9DA8]">{{ maintenance?.vehicle?.brand }} {{ maintenance?.vehicle?.model }}</div>
              </div>
              <div class="flex flex-col items-end gap-1.5">
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
              <div class="p-3 bg-[#11161A] rounded-xl border border-[#222A2F]">
                <span class="text-[11px] text-[#8E9DA8]">Oficina / Prestador</span>
                <div class="font-semibold text-white mt-0.5">{{ maintenance?.serviceProvider || 'Não informado' }}</div>
              </div>
              <div class="p-3 bg-[#11161A] rounded-xl border border-[#222A2F]">
                <span class="text-[11px] text-[#8E9DA8]">Odômetro no Serviço</span>
                <div class="font-semibold text-white mt-0.5 font-mono">
                  {{ (maintenance?.odometerAtService | number) ? (maintenance?.odometerAtService | number) + ' km' : 'Não registrado' }}
                </div>
              </div>
            </div>

            <!-- Descrição -->
            <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] text-xs">
              <span class="text-[11px] font-semibold text-[#8E9DA8] uppercase tracking-wider">Descrição / Motivo</span>
              <p class="text-white mt-1 whitespace-pre-wrap leading-relaxed">{{ maintenance?.description }}</p>
            </div>

            <!-- Peças e Serviços -->
            @if (maintenance?.items && maintenance!.items!.length > 0) {
              <div>
                <h4 class="text-xs font-bold text-white mb-2">Itens / Serviços Detalhados</h4>
                <div class="divide-y divide-[#222A2F] border border-[#222A2F] rounded-xl overflow-hidden">
                  @for (item of maintenance!.items!; track item.id || $index) {
                    <div class="p-2.5 bg-[#11161A] flex items-center justify-between text-xs">
                      <div>
                        <span class="font-medium text-white">{{ item.name }}</span>
                        <span class="text-[#8E9DA8] text-[11px] ml-1.5">({{ item.quantity }}x)</span>
                      </div>
                      <span class="font-semibold text-[#CAD2D9] font-mono">
                        {{ (item.cost * (item.quantity || 1)) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Total -->
            <div class="p-4 bg-[#FF6B00]/10 rounded-xl border border-[#FF6B00]/30 flex items-center justify-between">
              <span class="text-xs font-bold text-[#FF6B00]">Valor Total da Manutenção:</span>
              <span class="text-lg font-black text-white font-mono">
                {{ maintenance?.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                type="button"
                (click)="onClose()"
                class="px-5 py-2.5 text-xs font-semibold text-white bg-[#171D21] hover:bg-[#222A2F] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'EM_ANDAMENTO':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'CONCLUIDA':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CANCELADA':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-[#171D21] text-[#929EAA] border-[#222A2F]';
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
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  }

  getTypeLabel(type: MaintenanceType): string {
    return type === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva';
  }

  getTypeClass(type: MaintenanceType): string {
    return type === 'PREVENTIVA'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }
}
