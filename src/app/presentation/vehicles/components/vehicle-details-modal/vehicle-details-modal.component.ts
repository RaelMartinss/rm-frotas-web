import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IMaintenanceRepository } from '../../../../domain/repositories/maintenance.repository.interface';
import { IFuelRepository } from '../../../../domain/repositories/fuel.repository.interface';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { Maintenance } from '../../../../domain/models/maintenance.model';
import { FuelRecord } from '../../../../domain/models/fuel.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import {
  LucideTruck,
  LucideWrench,
  LucideFuel,
  LucideCalendar,
  LucideExternalLink,
  LucideLoader2,
  LucideRefreshCw
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    RouterLink,
    ModalShellComponent,
    LucideTruck,
    LucideWrench,
    LucideFuel,
    LucideCalendar,
    LucideExternalLink,
    LucideLoader2,
    LucideRefreshCw
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Ficha Técnica do Veículo"
      [subtitle]="(vehicle()?.brand ?? '') + ' ' + (vehicle()?.model ?? '') + ' • ' + (vehicle()?.plate ?? '')"
      maxWidth="xl"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
        <svg lucideTruck class="size-4"></svg>
      </div>

      <!-- ABAS DO MODAL -->
      <div class="flex border-b border-slate-200 bg-slate-50/40 px-6 shrink-0 gap-6 text-xs">
        <button
          type="button"
          (click)="setDetailsTab('OVERVIEW')"
          class="py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer"
          [ngClass]="activeDetailsTab() === 'OVERVIEW' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          <svg lucideTruck class="size-4"></svg>
          Visão Geral
        </button>
        <button
          type="button"
          (click)="setDetailsTab('MAINTENANCE')"
          class="py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer"
          [ngClass]="activeDetailsTab() === 'MAINTENANCE' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          <svg lucideWrench class="size-4"></svg>
          Histórico de Manutenção
          @if (vehicleMaintenances().length > 0) {
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold font-mono">
              {{ vehicleMaintenances().length }}
            </span>
          }
        </button>
        <button
          type="button"
          (click)="setDetailsTab('FUEL')"
          class="py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer"
          [ngClass]="activeDetailsTab() === 'FUEL' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          <svg lucideFuel class="size-4"></svg>
          Histórico de Abastecimento
          @if (vehicleFuelRecords().length > 0) {
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold font-mono">
              {{ vehicleFuelRecords().length }}
            </span>
          }
        </button>
      </div>

      <!-- CORPO DO MODAL COM SCROLL -->
      <div class="p-6 space-y-6">
        @if (activeDetailsTab() === 'OVERVIEW') {
          <!-- PLACA MERCOSUL DESIGN -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="w-56 border-2 border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white">
              <div class="bg-blue-700 text-white px-3 py-1 flex items-center justify-between text-[10px] font-bold tracking-wider">
                <span>BRASIL</span>
                <div class="size-2 rounded-full bg-yellow-400"></div>
              </div>
              <div class="py-2 text-center font-extrabold text-2xl tracking-widest text-slate-900 font-mono">
                {{ vehicle()?.plate }}
              </div>
            </div>
            @if (vehicle()?.renavam) {
              <div class="text-xs text-slate-500 font-medium">
                RENAVAM: <span class="font-mono font-bold text-slate-800">{{ vehicle()?.renavam }}</span>
              </div>
            }
          </div>

          <!-- CARDS DE INFORMAÇÃO -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div class="text-[11px] text-slate-400 font-medium">Marca & Modelo</div>
              <div class="text-sm font-bold text-slate-800 mt-0.5">{{ vehicle()?.brand }} {{ vehicle()?.model }}</div>
            </div>

            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div class="text-[11px] text-slate-400 font-medium">Ano de Fabricação</div>
              <div class="text-sm font-bold text-slate-800 mt-0.5">{{ vehicle()?.year }}</div>
            </div>

            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div class="text-[11px] text-slate-400 font-medium">Código RENAVAM</div>
              <div class="text-sm font-bold text-slate-800 mt-0.5 font-mono">
                {{ vehicle()?.renavam || 'Não informado' }}
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div class="text-[11px] text-slate-400 font-medium">Odômetro Atual</div>
              <div class="text-sm font-bold text-slate-800 mt-0.5 font-mono">{{ vehicle()?.currentKm | number }} km</div>
            </div>

            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 col-span-2">
              <div class="text-[11px] text-slate-400 font-medium">Status Operacional</div>
              <div class="mt-1">
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border shadow-2xs"
                  [ngClass]="getStatusClass(vehicle()?.status)"
                >
                  <span class="size-1.5 rounded-full" [ngClass]="getStatusDotClass(vehicle()?.status)"></span>
                  {{ getStatusLabel(vehicle()?.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- VENCIMENTO CRLV CARD -->
          <div class="p-4 rounded-xl border flex items-center justify-between"
            [ngClass]="isCrlvExpired(vehicle()?.crlvExpiration) ? 'bg-rose-50/50 border-rose-200' : (isCrlvExpiringSoon(vehicle()?.crlvExpiration) ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200/70')"
          >
            <div class="flex items-center gap-3">
              <div class="size-9 rounded-lg flex items-center justify-center"
                [ngClass]="isCrlvExpired(vehicle()?.crlvExpiration) ? 'bg-rose-100 text-rose-600' : (isCrlvExpiringSoon(vehicle()?.crlvExpiration) ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600')"
              >
                <svg lucideCalendar class="size-5"></svg>
              </div>
              <div>
                <div class="text-xs font-bold text-slate-800">Licenciamento / CRLV</div>
                <div class="text-[11px] text-slate-500">
                  {{ (vehicle()?.crlvExpiration | date:'dd/MM/yyyy') || 'Não informado' }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              @if (isCrlvExpired(vehicle()?.crlvExpiration)) {
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  Vencido
                </span>
              } @else if (isCrlvExpiringSoon(vehicle()?.crlvExpiration)) {
                <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  Próximo do Vencimento
                </span>
              } @else if (vehicle()?.crlvExpiration) {
                <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Regular
                </span>
              }
              <button
                type="button"
                (click)="onOpenRenewCrlv()"
                class="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                title="Renovar / Atualizar data do CRLV"
              >
                <svg lucideRefreshCw class="size-3"></svg>
                <span>Renovar</span>
              </button>
            </div>
          </div>
        } @else if (activeDetailsTab() === 'MAINTENANCE') {
          <!-- HISTÓRICO DE MANUTENÇÕES -->
          <div class="space-y-3">
            <div class="flex items-center justify-between pb-1 border-b border-slate-100">
              <span class="text-xs font-semibold text-slate-700">Histórico de Ordens</span>
              <a
                [routerLink]="['/manutencoes']"
                [queryParams]="{ vehicleId: vehicle()?.id }"
                (click)="onClose()"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                <span>Abrir na Central</span>
                <svg lucideExternalLink class="size-3.5"></svg>
              </a>
            </div>

            @if (isLoadingMaintenances()) {
              <div class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <svg lucideLoader2 class="size-6 animate-spin text-emerald-600"></svg>
                <span>Carregando histórico de manutenção...</span>
              </div>
            } @else if (vehicleMaintenances().length === 0) {
              <div class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <div class="size-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <svg lucideWrench class="size-6"></svg>
                </div>
                <span class="font-medium text-slate-600">Nenhuma manutenção registrada</span>
                <p class="text-[11px] text-slate-400">Este veículo ainda não possui ordens de serviço cadastradas.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (m of vehicleMaintenances(); track m.id) {
                  <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          [ngClass]="m.type === 'PREVENTIVA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                        >
                          {{ m.type === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva' }}
                        </span>
                        <span
                          class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          [ngClass]="getMaintenanceStatusClass(m.status)"
                        >
                          {{ getMaintenanceStatusLabel(m.status) }}
                        </span>
                      </div>
                      <span class="font-mono font-bold text-xs text-slate-800">
                        {{ m.cost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </span>
                    </div>

                    <p class="text-xs text-slate-700 font-medium">{{ m.description }}</p>

                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                      <div>
                        @if (m.serviceProvider) {
                          <span>Oficina: <strong class="text-slate-600 font-normal">{{ m.serviceProvider }}</strong></span>
                        }
                      </div>
                      <div>
                        {{ (m.finishedAt || m.startedAt || m.createdAt) | date:'dd/MM/yyyy' }}
                        @if (m.odometerAtService) {
                          • {{ m.odometerAtService | number }} km
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else if (activeDetailsTab() === 'FUEL') {
          <!-- HISTÓRICO DE ABASTECIMENTOS -->
          <div class="space-y-3">
            <div class="flex items-center justify-between pb-1 border-b border-slate-100">
              <span class="text-xs font-semibold text-slate-700">Histórico de Abastecimentos</span>
              <a
                [routerLink]="['/abastecimentos']"
                [queryParams]="{ vehicleId: vehicle()?.id }"
                (click)="onClose()"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                <span>Abrir na Central</span>
                <svg lucideExternalLink class="size-3.5"></svg>
              </a>
            </div>

            @if (isLoadingFuelRecords()) {
              <div class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <svg lucideLoader2 class="size-6 animate-spin text-emerald-600"></svg>
                <span>Carregando histórico de abastecimento...</span>
              </div>
            } @else if (vehicleFuelRecords().length === 0) {
              <div class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <div class="size-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <svg lucideFuel class="size-6"></svg>
                </div>
                <span class="font-medium text-slate-600">Nenhum abastecimento registrado</span>
                <p class="text-[11px] text-slate-400">Este veículo ainda não possui registros de abastecimento.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (f of vehicleFuelRecords(); track f.id) {
                  <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          {{ f.fuelType }}
                        </span>
                        @if (f.fullTank) {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Tanque Cheio
                          </span>
                        }
                      </div>
                      <span class="font-mono font-bold text-xs text-slate-800">
                        {{ f.totalCost | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-xs text-slate-700 font-medium">
                      <span>{{ f.liters | number:'1.2-2' }} L • {{ f.pricePerUnit | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}/L</span>
                      <span class="font-mono text-slate-600">{{ f.odometerAtFueling | number }} km</span>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                      <div>
                        @if (f.gasStation) {
                          <span>Posto: <strong class="text-slate-600 font-normal">{{ f.gasStation }}</strong></span>
                        }
                      </div>
                      <div>
                        {{ f.fueledAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <div footer class="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
        <button
          type="button"
          (click)="onClose()"
          class="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </app-modal-shell>
  `
})
export class VehicleDetailsModalComponent {
  private readonly maintenanceRepository = inject(IMaintenanceRepository);
  private readonly fuelRepository = inject(IFuelRepository);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);

  close = output<void>();
  openRenewCrlv = output<Vehicle>();

  activeDetailsTab = signal<'OVERVIEW' | 'MAINTENANCE' | 'FUEL'>('OVERVIEW');
  vehicleMaintenances = signal<Maintenance[]>([]);
  vehicleFuelRecords = signal<FuelRecord[]>([]);
  isLoadingMaintenances = signal(false);
  isLoadingFuelRecords = signal(false);

  constructor() {
    effect(() => {
      const v = this.vehicle();
      if (v && this.isOpen()) {
        this.activeDetailsTab.set('OVERVIEW');
        this.loadVehicleMaintenances(v.id);
        this.loadVehicleFuelRecords(v.id);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onOpenRenewCrlv(): void {
    const v = this.vehicle();
    if (v) {
      this.openRenewCrlv.emit(v);
    }
  }

  setDetailsTab(tab: 'OVERVIEW' | 'MAINTENANCE' | 'FUEL'): void {
    this.activeDetailsTab.set(tab);
  }

  loadVehicleMaintenances(vehicleId: string): void {
    this.isLoadingMaintenances.set(true);
    this.maintenanceRepository.getAll({ vehicleId, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicleMaintenances.set(res.data);
        this.isLoadingMaintenances.set(false);
      },
      error: () => {
        this.isLoadingMaintenances.set(false);
      }
    });
  }

  loadVehicleFuelRecords(vehicleId: string): void {
    this.isLoadingFuelRecords.set(true);
    this.fuelRepository.list({ vehicleId, limit: 100 }).subscribe({
      next: (res) => {
        this.vehicleFuelRecords.set(res.data);
        this.isLoadingFuelRecords.set(false);
      },
      error: () => {
        this.isLoadingFuelRecords.set(false);
      }
    });
  }

  isCrlvExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  isCrlvExpiringSoon(dateStr?: string): boolean {
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'Disponível';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'Em viagem';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'Em manutenção';
      default:
        return status || 'Indisponível';
    }
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'bg-blue-50 text-blue-700 border-blue-200/70';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/70';
    }
  }

  getStatusDotClass(status?: string): string {
    switch (status) {
      case 'AVAILABLE':
      case 'DISPONIVEL':
        return 'bg-emerald-500';
      case 'IN_USE':
      case 'EM_VIAGEM':
        return 'bg-blue-500';
      case 'IN_MAINTENANCE':
      case 'MANUTENCAO':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  }

  getMaintenanceStatusLabel(status: string): string {
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

  getMaintenanceStatusClass(status: string): string {
    switch (status) {
      case 'AGENDADA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EM_ANDAMENTO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONCLUIDA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELADA':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }
}
