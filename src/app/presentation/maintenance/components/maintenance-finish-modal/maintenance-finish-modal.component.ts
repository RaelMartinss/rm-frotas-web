import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Maintenance } from '../../../../domain/models/maintenance.model';
import {
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideLoader2,
  LucidePlus,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

export interface MaintenanceFinishSubmitPayload {
  odometerAtService: number;
  finishedAt?: string;
  items?: { name: string; cost: number; quantity: number }[];
  cost?: number;
}

@Component({
  selector: 'app-maintenance-finish-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideCheckCircle2,
    LucideX,
    LucidePlus,
    LucideTrash2,
    LucideAlertCircle,
    LucideLoader2,
  ],
  template: `
    @if (isOpen && maintenance) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
          <!-- HEADER DO MODAL -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <div class="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                  <svg lucideCheckCircle2 class="size-4"></svg>
                </div>
                Finalizar Manutenção & Liberar Veículo
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Veículo {{ maintenance?.vehicle?.plate }} - {{ maintenance?.vehicle?.model }}
              </p>
            </div>
            <button
              type="button"
              (click)="onClose()"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg lucideX class="size-5"></svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto space-y-5">
            <!-- Odômetro e Data de Conclusão -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Odômetro no Encerramento (KM) *</label>
                <input
                  type="number"
                  formControlName="odometerAtService"
                  class="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                @if (form.get('odometerAtService')?.touched && form.get('odometerAtService')?.invalid) {
                  <p class="text-[11px] text-rose-600 mt-1">Informe o odômetro atualizado.</p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Data de Conclusão</label>
                <input
                  type="date"
                  formControlName="finishedAt"
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <!-- Seção: Peças & Serviços Utilizados -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h3 class="text-xs font-bold text-slate-800">Peças e Serviços Utilizados</h3>
                  <p class="text-[11px] text-slate-400">Adicione os itens para detalhar os custos da ordem de serviço.</p>
                </div>
                <button
                  type="button"
                  (click)="addItem()"
                  class="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg lucidePlus class="size-3.5"></svg>
                  Adicionar Item
                </button>
              </div>

              <div class="space-y-2" formArrayName="items">
                @for (item of items.controls; track $index) {
                  <div [formGroupName]="$index" class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2">
                    <div class="flex-1">
                      <input
                        type="text"
                        formControlName="name"
                        placeholder="Descrição da peça ou serviço (ex: Troca de Óleo)"
                        class="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div class="w-20">
                      <input
                        type="number"
                        formControlName="quantity"
                        min="1"
                        placeholder="Qtd"
                        class="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                      />
                    </div>
                    <div class="w-28">
                      <input
                        type="number"
                        formControlName="cost"
                        min="0"
                        step="0.01"
                        placeholder="Valor R$"
                        class="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                      />
                    </div>
                    <button
                      type="button"
                      (click)="removeItem($index)"
                      class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover item"
                    >
                      <svg lucideTrash2 class="size-4"></svg>
                    </button>
                  </div>
                }

                <!-- Subtotal Calculado -->
                <div class="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span class="font-bold text-emerald-900">Total Calculado da Manutenção:</span>
                  <span class="font-extrabold text-sm text-emerald-800">
                    {{ calculateTotalCost() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>
              </div>
            </div>

            @if (errorMessage) {
              <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isLoading"
                class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isLoading"
                class="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                @if (isLoading) {
                  <svg lucideLoader2 class="size-4 animate-spin"></svg>
                }
                Finalizar & Liberar Veículo
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class MaintenanceFinishModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() maintenance: Maintenance | null = null;
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<MaintenanceFinishSubmitPayload>();

  form = this.fb.group({
    odometerAtService: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    finishedAt: new FormControl(''),
    items: this.fb.array<FormGroup>([]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.maintenance) {
      this.initForm(this.maintenance);
    }
  }

  private initForm(m: Maintenance): void {
    this.items.clear();

    if (m.items && m.items.length > 0) {
      for (const item of m.items) {
        this.items.push(
          this.fb.group({
            name: new FormControl(item.name, [Validators.required]),
            cost: new FormControl<number>(item.cost, [Validators.required, Validators.min(0)]),
            quantity: new FormControl<number>(item.quantity || 1, [
              Validators.required,
              Validators.min(1),
            ]),
          })
        );
      }
    } else {
      this.addItem();
    }

    const currentKm = m.vehicle?.currentKm ?? m.odometerAtService ?? 0;
    this.form.patchValue({
      odometerAtService: currentKm,
      finishedAt: new Date().toISOString().substring(0, 10),
    });
  }

  addItem(): void {
    this.items.push(
      this.fb.group({
        name: new FormControl('', [Validators.required]),
        cost: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        quantity: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
      })
    );
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  calculateTotalCost(): number {
    return this.items.controls.reduce((acc, ctrl) => {
      const cost = Number(ctrl.get('cost')?.value) || 0;
      const qty = Number(ctrl.get('quantity')?.value) || 1;
      return acc + cost * qty;
    }, 0);
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formVal = this.form.value;
    const items = (formVal.items as any[])
      .filter((i) => i.name && i.name.trim().length > 0)
      .map((i) => ({
        name: i.name,
        cost: Number(i.cost) || 0,
        quantity: Number(i.quantity) || 1,
      }));

    this.confirm.emit({
      odometerAtService: Number(formVal.odometerAtService),
      finishedAt: formVal.finishedAt || undefined,
      items: items.length > 0 ? items : undefined,
      cost: items.length === 0 ? this.calculateTotalCost() : undefined,
    });
  }
}
