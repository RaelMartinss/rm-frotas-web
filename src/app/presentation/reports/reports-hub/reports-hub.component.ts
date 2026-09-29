import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideTrendingUp,
  LucideFuel,
  LucideWrench,
  LucideFileSpreadsheet,
  LucideArrowRight,
  LucideClock
} from '@lucide/angular';

interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  route?: string;
  enabled: boolean;
  badge?: string;
  icon: 'trending' | 'fuel' | 'wrench' | 'dossier';
  metricsPreview?: string[];
}

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideTrendingUp,
    LucideFuel,
    LucideWrench,
    LucideFileSpreadsheet,
    LucideArrowRight,
    LucideClock
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-200">
      <!-- CABEÇALHO EXECUTIVO -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span class="size-1.5 rounded-full bg-emerald-500"></span>
              Inteligência de Frota
            </span>
            <span class="text-xs text-slate-400">•</span>
            <span class="text-xs text-slate-500 font-medium">Relatórios Analíticos</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Central de Relatórios</h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
            Métricas de desempenho financeiro, eficiência operacional e auditoria consolidada de custos.
          </p>
        </div>
      </div>

      <!-- GRID DE CARDS DE RELATÓRIO -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        @for (report of reports; track report.id) {
          @if (report.enabled && report.route) {
            <!-- CARD ATIVO -->
            <a
              [routerLink]="report.route"
              class="group relative bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                    @if (report.icon === 'trending') { <svg lucideTrendingUp class="size-5"></svg> }
                    @else if (report.icon === 'fuel') { <svg lucideFuel class="size-5"></svg> }
                    @else if (report.icon === 'wrench') { <svg lucideWrench class="size-5"></svg> }
                    @else { <svg lucideFileSpreadsheet class="size-5"></svg> }
                  </div>

                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    Disponível
                  </span>
                </div>

                <h3 class="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {{ report.title }}
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {{ report.description }}
                </p>

                @if (report.metricsPreview) {
                  <div class="flex flex-wrap gap-1.5 mt-4">
                    @for (m of report.metricsPreview; track m) {
                      <span class="text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                        {{ m }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                <span>Acessar relatório</span>
                <svg lucideArrowRight class="size-4 transform group-hover:translate-x-1 transition-transform"></svg>
              </div>
            </a>
          } @else {
            <!-- CARD DESABILITADO (EM BREVE) -->
            <div class="relative bg-slate-50/70 p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between opacity-80 select-none">
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="size-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                    @if (report.icon === 'trending') { <svg lucideTrendingUp class="size-5"></svg> }
                    @else if (report.icon === 'fuel') { <svg lucideFuel class="size-5"></svg> }
                    @else if (report.icon === 'wrench') { <svg lucideWrench class="size-5"></svg> }
                    @else { <svg lucideFileSpreadsheet class="size-5"></svg> }
                  </div>

                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full border border-slate-300/40">
                    <svg lucideClock class="size-3"></svg>
                    {{ report.badge || 'Em breve' }}
                  </span>
                </div>

                <h3 class="text-lg font-bold text-slate-700">
                  {{ report.title }}
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {{ report.description }}
                </p>

                @if (report.metricsPreview) {
                  <div class="flex flex-wrap gap-1.5 mt-4">
                    @for (m of report.metricsPreview; track m) {
                      <span class="text-[10px] font-medium bg-slate-100/80 text-slate-400 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {{ m }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Disponível em atualizações futuras</span>
                <span class="text-[11px] font-mono">Slice planejado</span>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class ReportsHubComponent {
  readonly reports: ReportCardItem[] = [
    {
      id: 'cost-per-km',
      title: 'Custo por Quilômetro Rodado (CPK)',
      description: 'Análise detalhada de custos de combustível e manutenção por km rodado de cada veículo, com comparação contra a média ponderada da frota e períodos anteriores.',
      route: '/relatorios/custo-km',
      enabled: true,
      icon: 'trending',
      metricsPreview: ['CPK R$/km', 'Combustível', 'Manutenção', 'Comparativo Frota', 'Exportação CSV']
    },
    {
      id: 'fuel-efficiency',
      title: 'Eficiência de Combustível & Abastecimentos',
      description: 'Média de consumo (km/l) por modelo e condutor, desvios operacionais, auditoria de postos parceiros e detecção de dispersão de preços por litro.',
      enabled: false,
      badge: 'Slice 2',
      icon: 'fuel',
      metricsPreview: ['Média km/l', 'Preço Médio/Litro', 'Postos Frequentes']
    },
    {
      id: 'maintenance-costs',
      title: 'Auditoria de Manutenções & Downtime',
      description: 'Consolidação de intervenções preventivas vs corretivas, custo médio por categoria de serviço, tempo de imobilização e oficinas credenciadas.',
      enabled: false,
      badge: 'Slice 3',
      icon: 'wrench',
      metricsPreview: ['Preventiva vs Corretiva', 'Dias Parado', 'Custo por Oficina']
    },
    {
      id: 'vehicle-dossier',
      title: 'Dossiê 360° do Veículo',
      description: 'Visão histórica consolidada de todo o ciclo de vida do ativo: todas as ordens de serviço, registros de hodômetro, viagens e sinistros.',
      enabled: false,
      badge: 'Slice 4',
      icon: 'dossier',
      metricsPreview: ['Histórico Completo', 'Linha do Tempo', 'Auditoria Geral']
    }
  ];
}
