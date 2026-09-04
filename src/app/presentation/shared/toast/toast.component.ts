import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';
import {
  LucideCheckCircle2,
  LucideXCircle,
  LucideInfo,
  LucideX
} from '@lucide/angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [
    CommonModule,
    LucideCheckCircle2,
    LucideXCircle,
    LucideInfo,
    LucideX
  ],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 fade-in"
          [ngClass]="{
            'bg-emerald-50/95 border-emerald-200 text-emerald-900': toast.type === 'success',
            'bg-rose-50/95 border-rose-200 text-rose-900': toast.type === 'error',
            'bg-sky-50/95 border-sky-200 text-sky-900': toast.type === 'info'
          }"
        >
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <svg lucideCheckCircle2 class="size-5 text-emerald-600"></svg>
            } @else if (toast.type === 'error') {
              <svg lucideXCircle class="size-5 text-rose-600"></svg>
            } @else {
              <svg lucideInfo class="size-5 text-sky-600"></svg>
            }
          </div>

          <div class="flex-1 text-xs font-medium leading-relaxed break-words">
            {{ toast.message }}
          </div>

          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          >
            <svg lucideX class="size-4"></svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
