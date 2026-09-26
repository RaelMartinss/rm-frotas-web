import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule, LucideX],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150"
        (click)="onBackdropClick($event)"
      >
        <div 
          class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
          [ngClass]="maxWidthClass()"
        >
          <!-- HEADER -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div class="flex items-center gap-2.5">
              <ng-content select="[header-icon]"></ng-content>
              <div>
                <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">{{ title() }}</h2>
                @if (subtitle()) {
                  <p class="text-[11px] text-slate-400 mt-0.5">{{ subtitle() }}</p>
                }
              </div>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              title="Fechar"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <!-- BODY COM SCROLL SUAVE -->
          <div class="overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>

          <!-- FOOTER OPCIONAL -->
          <div class="shrink-0">
            <ng-content select="[footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `
})
export class ModalShellComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  maxWidth = input<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'>('lg');
  closeOnBackdrop = input<boolean>(true);

  close = output<void>();

  maxWidthClass(): string {
    const map: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl'
    };
    return map[this.maxWidth()] || 'max-w-lg';
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
