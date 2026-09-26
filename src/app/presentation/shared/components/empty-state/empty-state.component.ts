import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-12 px-4 text-center">
      <div class="size-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <ng-content select="[icon]"></ng-content>
      </div>
      <p class="text-xs font-semibold text-slate-700">{{ title() }}</p>
      @if (description()) {
        <p class="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">{{ description() }}</p>
      }
      <div class="mt-4 flex items-center justify-center gap-2">
        <ng-content select="[action]"></ng-content>
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  title = input.required<string>();
  description = input<string>('');
}
