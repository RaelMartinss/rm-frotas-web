import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CostPerKmFilters,
  CostPerKmReportResponse,
  CostPerKmVehicleRow,
  InsufficientReason,
  ReportsApiService,
} from '../../../core/services/reports-api.service';
import { ReportShellComponent } from '../components/report-shell/report-shell.component';
import {
  ReportFilterBarComponent,
  ReportFilterState,
} from '../components/report-filter-bar/report-filter-bar.component';
import { KpiCardComponent } from '../components/kpi-card/kpi-card.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideDownload,
  LucideLoader2,
  LucideAlertTriangle,
  LucideInfo,
  LucideSearch,
  LucideHelpCircle,
  LucideChevronDown,
  LucideFileText,
  LucideFileDown,
} from '@lucide/angular';

@Component({
  selector: 'app-cost-per-km-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    ReportShellComponent,
    ReportFilterBarComponent,
    KpiCardComponent,
    PaginationComponent,
    LucideDownload,
    LucideLoader2,
    LucideAlertTriangle,
    LucideInfo,
    LucideSearch,
    LucideHelpCircle,
    LucideChevronDown,
    LucideFileText,
    LucideFileDown,
  ],
  template: `
    <app-report-shell
      title="Custo por Quilômetro Rodado (CPK)"
      description="Consolidação de custos de combustível e manutenção divididos pela quilometragem percorrida no período."
      backRoute="/relatorios"
      backLabel="Central de Relatórios"
    >
      <!-- ACTION BUTTONS: MENU EXPORTAR -->
      <div actions class="relative inline-block text-left">
        <button
          type="button"
          (click)="$event.stopPropagation(); toggleExportMenu()"
          [disabled]="loading() || exporting() || !hasData()"
          class="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#E05D00] disabled:opacity-50 text-[#080B0C] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:cursor-not-allowed"
          title="Exportar dados do relatório"
        >
          @if (exporting()) {
            <svg lucideLoader2 class="size-4 animate-spin"></svg>
            <span>Gerando {{ exportingFormat() === 'pdf' ? 'PDF' : 'CSV' }}...</span>
          } @else {
            <svg lucideDownload class="size-4"></svg>
            <span>Exportar</span>
            <svg lucideChevronDown class="size-3.5 opacity-80"></svg>
          }
        </button>

        @if (exportMenuOpen() && !exporting()) {
          <div
            (click)="$event.stopPropagation()"
            class="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#0F1215] shadow-xl border border-[#222A2F] py-1.5 z-50 text-xs focus:outline-none"
          >
            <button
              type="button"
              (click)="export('csv')"
              class="w-full text-left px-3.5 py-2 text-[#CAD2D9] hover:bg-[#171D21] flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <svg lucideFileText class="size-4 text-emerald-400 shrink-0"></svg>
              <div>
                <span class="font-bold text-white block">Exportar CSV</span>
                <span class="text-[10px] text-[#929EAA]">Planilha e dados brutos</span>
              </div>
            </button>
            <button
              type="button"
              (click)="export('pdf')"
              class="w-full text-left px-3.5 py-2 text-[#CAD2D9] hover:bg-[#171D21] flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <svg lucideFileDown class="size-4 text-rose-400 shrink-0"></svg>
              <div>
                <span class="font-bold text-white block">Exportar PDF</span>
                <span class="text-[10px] text-[#929EAA]">Documento executivo</span>
              </div>
            </button>
          </div>
        }
      </div>

      <!-- FILTERS SLOT -->
      <div filters>
        <app-report-filter-bar (filtersChange)="onFiltersChange($event)"></app-report-filter-bar>
      </div>

      <!-- CORPO PRINCIPAL COM BASE NOS ESTADOS -->
      <div class="space-y-6 mt-6">
        <!-- 1. SKELETON LOADING -->
        @if (loading()) {
          <div class="space-y-6 animate-pulse">
            <!-- 4 KPI Skeletons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="bg-[#0F1215] p-5 rounded-2xl border border-[#222A2F] shadow-2xs space-y-4">
                  <div class="flex justify-between items-center">
                    <div class="h-3.5 w-24 bg-[#171D21] rounded"></div>
                    <div class="h-5 w-16 bg-[#171D21] rounded-full"></div>
                  </div>
                  <div class="h-8 w-28 bg-[#171D21] rounded-lg"></div>
                  <div class="h-3 w-36 bg-[#171D21] rounded"></div>
                </div>
              }
            </div>

            <!-- Table Skeleton -->
            <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xs overflow-hidden p-6 space-y-4">
              <div class="h-5 w-44 bg-[#171D21] rounded"></div>
              <div class="h-10 bg-[#171D21] rounded-xl"></div>
              <div class="h-12 bg-[#11161A] rounded-xl"></div>
              <div class="h-12 bg-[#11161A] rounded-xl"></div>
              <div class="h-12 bg-[#11161A] rounded-xl"></div>
            </div>
          </div>
        }

        <!-- 2. ESTADO DE ERRO -->
        @else if (errorMsg()) {
          <div class="p-6 bg-rose-950/20 border border-rose-500/30 rounded-2xl text-rose-300 flex items-center justify-between shadow-2xs">
            <div class="flex items-center gap-4">
              <div class="size-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <svg lucideAlertTriangle class="size-5"></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-white">Falha ao processar o relatório</p>
                <p class="text-xs text-rose-400 mt-0.5">{{ errorMsg() }}</p>
              </div>
            </div>
            <button
              (click)="loadReport()"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        }

        <!-- 3. ESTADO VAZIO -->
        @else if (isEmpty()) {
          <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] p-12 text-center shadow-2xs">
            <div class="size-12 rounded-2xl bg-[#171D21] text-[#929EAA] flex items-center justify-center mx-auto mb-3 border border-[#222A2F]">
              <svg lucideSearch class="size-6"></svg>
            </div>
            <h3 class="text-base font-bold text-white">Nenhum dado encontrado</h3>
            <p class="text-xs sm:text-sm text-[#929EAA] mt-1 max-w-md mx-auto">
              Não encontramos abastecimentos ou manutenções finalizadas para o filtro e período selecionados.
            </p>
          </div>
        }

        <!-- 4. DADOS CARREGADOS -->
        @else if (reportData(); as report) {
          <!-- GRID DE KPIS -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <!-- Card 1: Custo Total -->
            <app-kpi-card
              label="Custo Total"
              [value]="(report.summary.totalCost | currency:'BRL') || 'R$ 0,00'"
              [subtext]="'Combustível: ' + (report.summary.totalFuelCost | currency:'BRL') + ' · Manutenção: ' + (report.summary.totalMaintenanceCost | currency:'BRL')"
              variant="default"
            ></app-kpi-card>

            <!-- Card 2: CPK da Frota -->
            <app-kpi-card
              label="CPK da Frota"
              [value]="report.summary.fleetCpk ? ((report.summary.fleetCpk | currency:'BRL') + '/km') : '—'"
              [subtext]="report.summary.fleetComparisonAvailable ? 'Média ponderada da frota' : 'Dados insuficientes para média'"
              [variant]="report.summary.fleetComparisonAvailable ? 'default' : 'warning'"
            ></app-kpi-card>

            <!-- Card 3: Km Rodados -->
            <app-kpi-card
              label="Km Rodados no Período"
              [value]="report.summary.eligibleKm != null ? ((report.summary.eligibleKm | number) + ' km') : '—'"
              [subtext]="report.summary.eligibleVehicles + ' veículos com odômetro ativo'"
              variant="default"
            ></app-kpi-card>

            <!-- Card 4: Veículos Acima da Média -->
            @if (report.summary.fleetComparisonAvailable) {
              <app-kpi-card
                label="Veículos Acima da Média"
                [value]="report.summary.aboveAverageCount"
                [badge]="'+20% vs frota'"
                [variant]="report.summary.aboveAverageCount > 0 ? 'alert' : 'success'"
                [subtext]="report.summary.aboveAverageCount > 0 ? 'Atenção para custos atípicos' : 'Toda a frota dentro do parâmetro'"
              ></app-kpi-card>
            } @else {
              <app-kpi-card
                label="Comparação de Frota"
                value="Indisponível"
                badge="Mín. 3 veículos"
                variant="warning"
                subtext="Exige ao menos 3 veículos elegíveis"
              ></app-kpi-card>
            }
          </div>

          <!-- AVISO QUANDO NENHUM VEÍCULO TEM DADOS SUFICIENTES -->
          @if (report.rows.length > 0 && report.summary.eligibleVehicles === 0) {
            <div class="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-amber-300 flex items-start gap-3 shadow-2xs">
              <svg lucideAlertTriangle class="size-4.5 text-amber-400 shrink-0 mt-0.5"></svg>
              <div class="text-xs leading-relaxed">
                <span class="font-bold text-amber-200">Aviso de Dados Insuficientes:</span> Nenhum veículo atingiu os critérios mínimos no período (mínimo de 100 km rodados com odômetro consistente). Verifique se há abastecimentos e leituras de odômetro registradas no período para cálculo de CPK.
              </div>
            </div>
          }

          <!-- AVISO DE COMPARAÇÃO DE FROTA SE DESATIVADA -->
          @if (!report.summary.fleetComparisonAvailable && report.summary.eligibleVehicles > 0) {
            <div class="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-amber-300 flex items-start gap-3 shadow-2xs">
              <svg lucideInfo class="size-4.5 text-amber-400 shrink-0 mt-0.5"></svg>
              <div class="text-xs leading-relaxed">
                <span class="font-bold text-amber-200">Aviso de Comparação:</span> A comparação de desvio contra a média da frota exige no mínimo 3 veículos com odômetro consistente e mais de 100 km rodados. Foque na coluna <strong class="text-amber-200 font-bold">vs Período Anterior</strong> para acompanhar tendências individuais.
              </div>
            </div>
          }

          <!-- TABELA DE VEÍCULOS -->
          <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] shadow-2xs overflow-hidden">
            <div class="px-5 py-4 border-b border-[#222A2F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 class="text-sm font-bold text-white">Detalhamento por Ativo</h3>
                <p class="text-xs text-[#929EAA]">
                  {{ report.pagination.totalItems }} veículo(s) computado(s) no período de {{ report.period.from }} a {{ report.period.to }}
                </p>
              </div>

              <!-- ORDENAÇÃO RÁPIDA -->
              <div class="flex items-center gap-2">
                <span class="text-xs text-[#62707C] font-medium">Ordenar por:</span>
                <select
                  [ngModel]="currentSort()"
                  (ngModelChange)="onSortChange($event)"
                  class="px-2.5 py-1 text-xs bg-[#11161A] border border-[#222A2F] rounded-lg text-white focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                >
                  <option value="cpk_desc" class="bg-[#11161A] text-white">Maior CPK (R$/km)</option>
                  <option value="cpk_asc" class="bg-[#11161A] text-white">Menor CPK (R$/km)</option>
                  <option value="plate" class="bg-[#11161A] text-white">Placa do Veículo</option>
                </select>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#11161A] border-b border-[#222A2F] text-[#62707C] font-semibold uppercase tracking-wider text-[10px]">
                    <th class="py-3 px-4">Placa</th>
                    <th class="py-3 px-4">Modelo / Ano</th>
                    <th class="py-3 px-4 text-right">Combustível</th>
                    <th class="py-3 px-4 text-right">Manutenção</th>
                    <th class="py-3 px-4 text-right">Custo Total</th>
                    <th class="py-3 px-4 text-right">Km Rodados</th>
                    <th class="py-3 px-4 text-right">
                      <div class="inline-flex items-center gap-1 cursor-help" title="Períodos curtos podem distorcer o CPK (manutenções são pontuais).">
                        <span>CPK (R$/km)</span>
                        <svg lucideHelpCircle class="size-3 text-[#62707C]"></svg>
                      </div>
                    </th>
                    <th class="py-3 px-4 text-right">vs Frota</th>
                    <th class="py-3 px-4 text-right">vs Anterior</th>
                    <th class="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#222A2F]">
                  @for (row of report.rows; track row.vehicleId) {
                    <tr
                      class="transition-colors"
                      [ngClass]="{
                        'bg-rose-950/20 hover:bg-rose-950/30': row.status === 'ABOVE_AVERAGE',
                        'hover:bg-[#171D21]': row.status !== 'ABOVE_AVERAGE'
                      }"
                    >
                      <!-- Placa -->
                      <td class="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {{ row.plate }}
                      </td>

                      <!-- Modelo / Ano -->
                      <td class="py-3.5 px-4 text-[#CAD2D9] whitespace-nowrap">
                        <span>{{ row.model }}</span>
                        <span class="text-[#62707C] ml-1">({{ row.year }})</span>
                      </td>

                      <!-- Combustível -->
                      <td class="py-3.5 px-4 font-mono text-right text-[#CAD2D9] whitespace-nowrap">
                        {{ row.fuelCost | currency:'BRL' }}
                      </td>

                      <!-- Manutenção -->
                      <td class="py-3.5 px-4 font-mono text-right text-[#CAD2D9] whitespace-nowrap">
                        {{ row.maintenanceCost | currency:'BRL' }}
                      </td>

                      <!-- Custo Total -->
                      <td class="py-3.5 px-4 font-mono font-bold text-right text-white whitespace-nowrap">
                        {{ row.totalCost | currency:'BRL' }}
                      </td>

                      <!-- Km Rodados -->
                      <td class="py-3.5 px-4 font-mono text-right text-[#CAD2D9] whitespace-nowrap">
                        {{ row.km | number }} km
                      </td>

                      <!-- CPK -->
                      <td class="py-3.5 px-4 font-mono font-bold text-right whitespace-nowrap">
                        @if (row.cpk !== null) {
                          <span [ngClass]="row.status === 'ABOVE_AVERAGE' ? 'text-rose-400 font-black' : 'text-white'">
                            {{ row.cpk | currency:'BRL' }}
                          </span>
                        } @else {
                          <span
                            class="text-[#62707C] cursor-help underline decoration-dotted"
                            [title]="mapInsufficientReason(row.insufficientReason)"
                          >
                            —
                          </span>
                        }
                      </td>

                      <!-- vs Frota -->
                      <td class="py-3.5 px-4 font-mono text-right whitespace-nowrap">
                        @if (row.deltaVsFleetPercent !== null) {
                          <span
                            class="font-semibold"
                            [ngClass]="row.deltaVsFleetPercent > 0 ? 'text-rose-400' : 'text-emerald-400'"
                          >
                            {{ row.deltaVsFleetPercent > 0 ? '+' : '' }}{{ row.deltaVsFleetPercent }}%
                          </span>
                        } @else {
                          <span class="text-[#62707C]">—</span>
                        }
                      </td>

                      <!-- vs Período Anterior -->
                      <td class="py-3.5 px-4 font-mono text-right whitespace-nowrap">
                        @if (row.deltaVsPreviousPercent !== null) {
                          <span
                            class="font-semibold"
                            [ngClass]="row.deltaVsPreviousPercent > 0 ? 'text-rose-400' : 'text-emerald-400'"
                          >
                            {{ row.deltaVsPreviousPercent > 0 ? '+' : '' }}{{ row.deltaVsPreviousPercent }}%
                          </span>
                        } @else {
                          <span class="text-[#62707C]">—</span>
                        }
                      </td>

                      <!-- Status Badge -->
                      <td class="py-3.5 px-4 text-center whitespace-nowrap">
                        @if (row.status === 'OK') {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Normal
                          </span>
                        } @else if (row.status === 'ABOVE_AVERAGE') {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Acima da Média
                          </span>
                        } @else {
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#171D21] text-[#929EAA] border border-[#222A2F] cursor-help"
                            [title]="mapInsufficientReason(row.insufficientReason)"
                          >
                            Dados Insuficientes
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot class="border-t-2 border-[#222A2F] text-xs">
                  <!-- Linha 1: Elegíveis -->
                  <tr class="bg-emerald-950/20 text-[#CAD2D9]">
                    <td class="py-2.5 px-4 font-bold text-white" colspan="2">
                      Elegíveis
                      <span class="font-normal text-[#929EAA] text-[10px] ml-1">({{ report.summary.eligible?.vehicles ?? '—' }} veículos)</span>
                    </td>
                    <td class="py-2.5 px-4 font-mono text-right">{{ report.summary.eligible?.fuelCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right">{{ report.summary.eligible?.maintenanceCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right font-bold text-white">{{ report.summary.eligible?.totalCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right">{{ (report.summary.eligible?.km | number) ?? '—' }} km</td>
                    <td class="py-2.5 px-4 font-mono text-right font-bold text-emerald-400">
                      {{ report.summary.eligible?.cpk ? ((report.summary.eligible.cpk | currency:'BRL') + '/km') : '—' }}
                    </td>
                    <td class="py-2.5 px-4 text-center text-[#62707C] font-mono" colspan="3">—</td>
                  </tr>
                  <!-- Linha 2: Sem dados suficientes -->
                  <tr class="bg-[#11161A] text-[#929EAA]">
                    <td class="py-2.5 px-4 font-semibold text-[#CAD2D9]" colspan="2">
                      Sem dados suficientes
                      <span class="font-normal text-[10px] ml-1">({{ report.summary.insufficient?.vehicles ?? '—' }} veículos)</span>
                    </td>
                    <td class="py-2.5 px-4 font-mono text-right">{{ report.summary.insufficient?.fuelCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right">{{ report.summary.insufficient?.maintenanceCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right font-semibold text-[#CAD2D9]">{{ report.summary.insufficient?.totalCost | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 font-mono text-right text-[#62707C]">—</td>
                    <td class="py-2.5 px-4 font-mono text-right text-[#62707C]">—</td>
                    <td class="py-2.5 px-4 text-center text-[#62707C] font-mono" colspan="3">—</td>
                  </tr>
                  <!-- Linha 3: Total Geral -->
                  <tr class="border-t-2 border-[#222A2F] bg-[#0B0E11] font-bold text-white">
                    <td class="py-3 px-4" colspan="2">
                      Totais da Frota
                      <span class="font-normal text-[#929EAA] text-[10px] ml-1">({{ report.pagination.totalItems }} veículos)</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-right">{{ report.summary.totalFuelCost | currency:'BRL' }}</td>
                    <td class="py-3 px-4 font-mono text-right">{{ report.summary.totalMaintenanceCost | currency:'BRL' }}</td>
                    <td class="py-3 px-4 font-mono text-right text-[#FF6B00]">{{ report.summary.totalCost | currency:'BRL' }}</td>
                    <td class="py-3 px-4 font-mono text-right text-[#CAD2D9] font-normal">{{ report.summary.eligibleKm | number }} km</td>
                    <td class="py-3 px-4 font-mono text-right text-emerald-400">
                      {{ report.summary.fleetCpk ? ((report.summary.fleetCpk | currency:'BRL') + '/km') : '—' }}
                    </td>
                    <td class="py-3 px-4 text-right text-[#62707C] font-mono font-normal">—</td>
                    <td class="py-3 px-4 text-right text-[#62707C] font-mono font-normal">—</td>
                    <td class="py-3 px-4 text-center text-[#929EAA] text-[10px] font-normal">{{ report.summary.eligibleVehicles }} elegíveis</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- PAGINAÇÃO -->
            <app-pagination
              [totalItems]="report.pagination.totalItems"
              [currentPage]="currentPage()"
              [pageSize]="pageSize()"
              [pageSizeOptions]="[10, 20, 50]"
              (pageChange)="onPageChange($event)"
              (pageSizeChange)="onPageSizeChange($event)"
              itemLabel="veículos"
            ></app-pagination>
          </div>
        }
      </div>
  `,
})
export class CostPerKmReportComponent {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly toast = inject(ToastService);

  readonly state = signal<'loading' | 'loaded' | 'empty' | 'error'>('loading');
  readonly reportData = signal<CostPerKmReportResponse | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly exporting = signal<boolean>(false);
  readonly exportMenuOpen = signal<boolean>(false);
  readonly exportingFormat = signal<'csv' | 'pdf' | null>(null);

  @HostListener('document:click')
  closeExportMenu(): void {
    this.exportMenuOpen.set(false);
  }

  toggleExportMenu(): void {
    this.exportMenuOpen.update((v) => !v);
  }

  readonly currentFilters = signal<CostPerKmFilters | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly currentSort = signal<string>('cpk_desc');

  readonly loading = computed(() => this.state() === 'loading');
  readonly isEmpty = computed(() => this.state() === 'empty');
  readonly hasData = computed(
    () => this.state() === 'loaded' && !!this.reportData()?.rows?.length
  );

  onFiltersChange(filterState: ReportFilterState): void {
    this.currentFilters.set({
      from: filterState.from,
      to: filterState.to,
      vehicleId: filterState.vehicleId,
    });
    this.currentPage.set(1);
    this.loadReport();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadReport();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadReport();
  }

  onSortChange(sort: string): void {
    this.currentSort.set(sort);
    this.currentPage.set(1);
    this.loadReport();
  }

  loadReport(): void {
    const filters = this.currentFilters();
    if (!filters || !filters.from || !filters.to) {
      return;
    }

    this.state.set('loading');
    this.errorMsg.set(null);

    const query: CostPerKmFilters = {
      from: filters.from,
      to: filters.to,
      vehicleId: filters.vehicleId,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sort: this.currentSort(),
    };

    this.reportsApi.getCostPerKm(query).subscribe({
      next: (res) => {
        this.reportData.set(res);
        if (!res.rows || res.rows.length === 0) {
          this.state.set('empty');
        } else {
          this.state.set('loaded');
        }
      },
      error: (err) => {
        const message =
          err?.error?.message ||
          'Erro ao carregar o relatório de custo por km. Verifique o período.';
        this.errorMsg.set(message);
        this.state.set('error');
      },
    });
  }

  export(format: 'csv' | 'pdf'): void {
    const filters = this.currentFilters();
    if (!filters) return;

    this.exportMenuOpen.set(false);
    this.exporting.set(true);
    this.exportingFormat.set(format);

    const exportQuery: CostPerKmFilters = {
      from: filters.from,
      to: filters.to,
      vehicleId: filters.vehicleId,
      sort: this.currentSort(),
    };

    this.reportsApi.exportCostPerKm(exportQuery, format).subscribe({
      next: (blob) => {
        const ext = format === 'pdf' ? 'pdf' : 'csv';
        const filename = `relatorio-custo-km-${filters.from}-a-${filters.to}.${ext}`;
        this.reportsApi.downloadBlob(blob, filename);
        this.exporting.set(false);
        this.exportingFormat.set(null);
        this.toast.success(
          format === 'pdf'
            ? 'Relatório PDF gerado com sucesso.'
            : 'Relatório CSV exportado com sucesso.'
        );
      },
      error: (err) => {
        this.exporting.set(false);
        this.exportingFormat.set(null);
        if (err?.status === 422) {
          this.toast.error(
            'Muitos veículos para PDF. Use o CSV ou reduza o período/filtre um veículo.'
          );
        } else {
          this.toast.error(
            format === 'pdf'
              ? 'Falha ao exportar relatório PDF. Tente novamente.'
              : 'Falha ao exportar relatório CSV. Tente novamente.'
          );
        }
      },
    });
  }

  mapInsufficientReason(reason: InsufficientReason | null): string {
    switch (reason) {
      case 'LOW_KM':
        return 'Menos de 100 km rodados no período';
      case 'NO_READINGS':
        return 'Sem leituras de odômetro no período';
      case 'KM_REGRESSION':
        return 'Odômetro inconsistente ou em regressão';
      case 'KM_OUTLIER':
        return 'Km incompatível com o período (possível erro de digitação)';
      default:
        return 'Dados insuficientes para cálculo de CPK';
    }
  }
}
