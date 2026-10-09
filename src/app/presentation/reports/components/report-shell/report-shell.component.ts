import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'app-report-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowLeft],
  template: `
    <div class="space-y-6 animate-in fade-in duration-200">
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222A2F] pb-5">
        <div>
          @if (showBackButton()) {
            <a
              [routerLink]="backRoute()"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#929EAA] hover:text-[#FF6B00] transition-colors mb-2 cursor-pointer"
            >
              <svg lucideArrowLeft class="size-3.5"></svg>
              <span>{{ backLabel() }}</span>
            </a>
          }
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            {{ title() }}
          </h1>
          @if (description()) {
            <p class="text-xs sm:text-sm text-[#929EAA] mt-1 max-w-3xl">
              {{ description() }}
            </p>
          }
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>

      <!-- FILTERS SLOT -->
      <div class="bg-[#0F1215] rounded-2xl border border-[#222A2F] p-4 shadow-2xs">
        <ng-content select="[filters]"></ng-content>
      </div>

      <!-- BODY CONTENT SLOT -->
      <div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ReportShellComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly showBackButton = input<boolean>(true);
  readonly backRoute = input<string>('/relatorios');
  readonly backLabel = input<string>('Voltar para Hub de Relatórios');
}
