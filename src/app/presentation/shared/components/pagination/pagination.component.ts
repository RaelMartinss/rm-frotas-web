import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight
} from '@lucide/angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [
    CommonModule,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight
  ],
  template: `
    @if (totalItems() > 0) {
      <div class="px-5 py-3.5 bg-[#0B0E11] border-t border-[#222A2F] flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <!-- Resumo de Itens -->
        <div class="text-[#929EAA] font-medium">
          Mostrando <span class="font-bold text-white">{{ startIndex() }}</span> a
          <span class="font-bold text-white">{{ endIndex() }}</span> de
          <span class="font-bold text-white">{{ totalItems() | number }}</span> {{ itemLabel() }}
        </div>

        @if (totalItems() > 10) {
          <div class="flex flex-wrap items-center gap-4">
            <!-- Seletor de Limite por Página -->
            <div class="flex items-center gap-2">
              <span class="text-[#929EAA] text-[11px]">Itens por página:</span>
              <div class="inline-flex rounded-lg border border-[#222A2F] bg-[#11161A] p-0.5 shadow-2xs">
                @for (size of pageSizeOptions(); track size) {
                  <button
                    type="button"
                    (click)="onSelectPageSize(size)"
                    class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
                    [ngClass]="pageSize() === size ? 'bg-[#FF6B00] text-[#080B0C] font-bold shadow-xs' : 'text-[#929EAA] hover:text-white hover:bg-[#171D21]'"
                  >
                    {{ size }}
                  </button>
                }
              </div>
            </div>

            <!-- Controles de Navegação de Página -->
            <div class="flex items-center gap-1">
              <!-- Primeira Página -->
              <button
                type="button"
                (click)="goToPage(1)"
                [disabled]="currentPage() === 1"
                title="Primeira página"
                class="p-1.5 rounded-lg border border-[#222A2F] bg-[#11161A] text-[#929EAA] hover:text-white hover:bg-[#171D21] disabled:opacity-30 disabled:hover:bg-[#11161A] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <svg lucideChevronsLeft class="size-3.5"></svg>
              </button>

              <!-- Página Anterior -->
              <button
                type="button"
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                title="Página anterior"
                class="p-1.5 rounded-lg border border-[#222A2F] bg-[#11161A] text-[#929EAA] hover:text-white hover:bg-[#171D21] disabled:opacity-30 disabled:hover:bg-[#11161A] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <svg lucideChevronLeft class="size-3.5"></svg>
              </button>

              <!-- Números de Página -->
              <div class="flex items-center gap-1 px-1">
                @for (pageNum of pageNumbers(); track $index) {
                  @if (pageNum === '...') {
                    <span class="px-2 py-1 text-[#62707C] text-xs font-mono">...</span>
                  } @else {
                    <button
                      type="button"
                      (click)="goToPage(+pageNum)"
                      class="min-w-[30px] h-7.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      [ngClass]="currentPage() === +pageNum ? 'bg-[#FF6B00] text-[#080B0C] font-bold shadow-xs' : 'bg-[#11161A] text-[#929EAA] border border-[#222A2F] hover:bg-[#171D21] hover:text-white'"
                    >
                      {{ pageNum }}
                    </button>
                  }
                }
              </div>

              <!-- Próxima Página -->
              <button
                type="button"
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === totalPages()"
                title="Próxima página"
                class="p-1.5 rounded-lg border border-[#222A2F] bg-[#11161A] text-[#929EAA] hover:text-white hover:bg-[#171D21] disabled:opacity-30 disabled:hover:bg-[#11161A] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <svg lucideChevronRight class="size-3.5"></svg>
              </button>

              <!-- Última Página -->
              <button
                type="button"
                (click)="goToPage(totalPages())"
                [disabled]="currentPage() === totalPages()"
                title="Última página"
                class="p-1.5 rounded-lg border border-[#222A2F] bg-[#11161A] text-[#929EAA] hover:text-white hover:bg-[#171D21] disabled:opacity-30 disabled:hover:bg-[#11161A] transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <svg lucideChevronsRight class="size-3.5"></svg>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class PaginationComponent {
  totalItems = input.required<number>();
  currentPage = input<number>(1);
  pageSize = input<number>(10);
  pageSizeOptions = input<number[]>([10, 25, 50]);
  itemLabel = input<string>('itens');

  pageChange = output<number>();
  pageSizeChange = output<number>();

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  startIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 1;
    const range: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < total - 1) range.push('...');
    range.push(total);

    return range;
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }

  onSelectPageSize(size: number): void {
    if (size !== this.pageSize()) {
      this.pageSizeChange.emit(size);
    }
  }
}
