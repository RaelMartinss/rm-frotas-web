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
        'bg-white border-slate-200/80 text-slate-900': variant() === 'default',
        'bg-rose-50/70 border-rose-200 text-rose-900': variant() === 'alert',
        'bg-emerald-50/70 border-emerald-200 text-emerald-900': variant() === 'success',
        'bg-amber-50/70 border-amber-200 text-amber-900': variant() === 'warning'
      }"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <span
          class="text-[11px] font-bold uppercase tracking-wider"
          [ngClass]="{
            'text-slate-500': variant() === 'default',
            'text-rose-700': variant() === 'alert',
            'text-emerald-700': variant() === 'success',
            'text-amber-700': variant() === 'warning'
          }"
        >
          {{ label() }}
        </span>
        @if (badge()) {
          <span
            class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            [ngClass]="{
              'bg-slate-100 text-slate-600': variant() === 'default',
              'bg-rose-100 text-rose-700 border border-rose-200': variant() === 'alert',
              'bg-emerald-100 text-emerald-700 border border-emerald-200': variant() === 'success',
              'bg-amber-100 text-amber-700 border border-amber-200': variant() === 'warning'
            }"
          >
            {{ badge() }}
          </span>
        }
      </div>

      <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight">
        {{ value() }}
      </div>

      @if (subtext()) {
        <p
          class="mt-1 text-xs"
          [ngClass]="{
            'text-slate-500': variant() === 'default',
            'text-rose-600': variant() === 'alert',
            'text-emerald-600': variant() === 'success',
            'text-amber-600': variant() === 'warning'
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
