import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="p-5 rounded-2xl border transition-all duration-200 shadow-2xs"
      [ngClass]="{
        'bg-[#0F1215] border-[#222A2F] text-white': variant() === 'default',
        'bg-rose-950/20 border-rose-500/30 text-rose-300': variant() === 'alert',
        'bg-emerald-950/20 border-emerald-500/30 text-emerald-300': variant() === 'success',
        'bg-amber-950/20 border-amber-500/30 text-amber-300': variant() === 'warning'
      }"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <span
          class="text-[11px] font-bold uppercase tracking-wider"
          [ngClass]="{
            'text-[#62707C]': variant() === 'default',
            'text-rose-400': variant() === 'alert',
            'text-emerald-400': variant() === 'success',
            'text-amber-400': variant() === 'warning'
          }"
        >
          {{ label() }}
        </span>
        @if (badge()) {
          <span
            class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            [ngClass]="{
              'bg-[#171D21] text-[#929EAA] border border-[#222A2F]': variant() === 'default',
              'bg-rose-500/20 text-rose-300 border border-rose-500/30': variant() === 'alert',
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30': variant() === 'success',
              'bg-amber-500/20 text-amber-300 border border-amber-500/30': variant() === 'warning'
            }"
          >
            {{ badge() }}
          </span>
        }
      </div>

      <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
        {{ value() }}
      </div>

      @if (subtext()) {
        <p
          class="mt-1 text-xs"
          [ngClass]="{
            'text-[#929EAA]': variant() === 'default',
            'text-rose-400': variant() === 'alert',
            'text-emerald-400': variant() === 'success',
            'text-amber-400': variant() === 'warning'
          }"
        >
          {{ subtext() }}
        </p>
      }
    </div>
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtext = input<string>();
  readonly badge = input<string>();
  readonly variant = input<'default' | 'alert' | 'success' | 'warning'>('default');
}
