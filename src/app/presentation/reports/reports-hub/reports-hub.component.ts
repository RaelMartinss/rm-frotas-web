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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222A2F] pb-5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span class="size-1.5 rounded-full bg-emerald-400"></span>
              Inteligência de Frota
            </span>
            <span class="text-xs text-[#62707C]">•</span>
            <span class="text-xs text-[#929EAA] font-medium">Relatórios Analíticos</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Central de Relatórios</h1>
          <p class="text-xs sm:text-sm text-[#929EAA] mt-0.5">
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
              class="group relative bg-[#0F1215] p-6 rounded-2xl border border-[#222A2F] shadow-2xs hover:shadow-md hover:border-[#FF6B00]/60 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="size-11 rounded-xl bg-[#171D21] text-[#FF6B00] flex items-center justify-center border border-[#222A2F] group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                    @if (report.icon === 'trending') { <svg lucideTrendingUp class="size-5"></svg> }
                    @else if (report.icon === 'fuel') { <svg lucideFuel class="size-5"></svg> }
                    @else if (report.icon === 'wrench') { <svg lucideWrench class="size-5"></svg> }
                    @else { <svg lucideFileSpreadsheet class="size-5"></svg> }
                  </div>

                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Disponível
                  </span>
                </div>

                <h3 class="text-lg font-bold text-white group-hover:text-[#FF6B00] transition-colors">
                  {{ report.title }}
                </h3>
                <p class="text-xs sm:text-sm text-[#929EAA] mt-1.5 leading-relaxed">
                  {{ report.description }}
                </p>

                @if (report.metricsPreview) {
                  <div class="flex flex-wrap gap-1.5 mt-4">
                    @for (m of report.metricsPreview; track m) {
                      <span class="text-[10px] font-medium bg-[#11161A] text-[#CAD2D9] border border-[#222A2F] px-2 py-0.5 rounded-md">
                        {{ m }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="mt-6 pt-4 border-t border-[#222A2F] flex items-center justify-between text-xs font-bold text-[#FF6B00] group-hover:text-[#E05D00]">
                <span>Acessar relatório</span>
                <svg lucideArrowRight class="size-4 transform group-hover:translate-x-1 transition-transform"></svg>
              </div>
            </a>
          } @else {
            <!-- CARD DESABILITADO (EM BREVE) -->
            <div class="relative bg-[#0B0E11] p-6 rounded-2xl border border-[#222A2F]/60 flex flex-col justify-between opacity-60 select-none">
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="size-11 rounded-xl bg-[#11161A] text-[#62707C] flex items-center justify-center border border-[#222A2F]">
                    @if (report.icon === 'trending') { <svg lucideTrendingUp class="size-5"></svg> }
                    @else if (report.icon === 'fuel') { <svg lucideFuel class="size-5"></svg> }
                    @else if (report.icon === 'wrench') { <svg lucideWrench class="size-5"></svg> }
                    @else { <svg lucideFileSpreadsheet class="size-5"></svg> }
                  </div>

                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#62707C] bg-[#171D21] px-2.5 py-1 rounded-full border border-[#222A2F]">
                    <svg lucideClock class="size-3"></svg>
                    {{ report.badge || 'Em breve' }}
                  </span>
                </div>

                <h3 class="text-lg font-bold text-[#62707C]">
                  {{ report.title }}
                </h3>
                <p class="text-xs sm:text-sm text-[#62707C] mt-1.5 leading-relaxed">
                  {{ report.description }}
                </p>

                @if (report.metricsPreview) {
                  <div class="flex flex-wrap gap-1.5 mt-4">
                    @for (m of report.metricsPreview; track m) {
                      <span class="text-[10px] font-medium bg-[#11161A] text-[#62707C] border border-[#222A2F]/60 px-2 py-0.5 rounded-md">
                        {{ m }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="mt-6 pt-4 border-t border-[#222A2F]/60 flex items-center justify-between text-xs font-medium text-[#62707C]">
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
