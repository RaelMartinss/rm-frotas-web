import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import {
  LucideFileText,
  LucideLoader2,
  LucideAlertCircle
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-update-crlv-modal',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    ModalShellComponent,
    LucideFileText,
    LucideLoader2,
    LucideAlertCircle
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Renovar / Atualizar CRLV"
      maxWidth="md"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
        <svg lucideFileText class="size-4"></svg>
      </div>

      <form [formGroup]="updateCrlvForm" (ngSubmit)="confirmUpdateCrlv()" class="p-6 space-y-4">
        @if (actionError()) {
          <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
            <svg lucideAlertCircle class="size-4 text-rose-600 shrink-0"></svg>
            <span>{{ actionError() }}</span>
          </div>
        }

        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
          <div class="text-slate-500 text-[11px]">Veículo selecionado:</div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">{{ vehicle()?.brand }} {{ vehicle()?.model }}</span>
            <span class="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded-md border border-slate-700">
              {{ vehicle()?.plate }}
            </span>
          </div>
          <div class="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
            <span>Vencimento Atual:</span>
            <span class="font-medium text-xs">
              {{ (vehicle()?.crlvExpiration | date:'dd/MM/yyyy') || 'Não cadastrado' }}
            </span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Nova Data de Vencimento do CRLV <span class="text-rose-500">*</span>
          </label>
          <input
            type="date"
            formControlName="crlvExpiration"
            class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            [class.border-rose-400]="updateCrlvForm.get('crlvExpiration')?.invalid && updateCrlvForm.get('crlvExpiration')?.touched"
            [class.border-slate-200]="!(updateCrlvForm.get('crlvExpiration')?.invalid && updateCrlvForm.get('crlvExpiration')?.touched)"
          />
          @if (updateCrlvForm.get('crlvExpiration')?.touched && updateCrlvForm.get('crlvExpiration')?.errors?.['required']) {
            <p class="text-[10px] text-rose-500 mt-1 font-medium">
              A nova data de vencimento é obrigatória.
            </p>
          }
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            (click)="onClose()"
            [disabled]="isActionLoading()"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="isActionLoading()"
            class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            @if (isActionLoading()) {
              <svg lucideLoader2 class="size-4 animate-spin"></svg>
            }
            Salvar Novo Vencimento
          </button>
        </div>
      </form>
    </app-modal-shell>
  `
})
export class VehicleUpdateCrlvModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);

  close = output<void>();
  crlvUpdated = output<Vehicle>();

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  updateCrlvForm: FormGroup = this.fb.group({
    crlvExpiration: ['', [Validators.required]]
  });

  constructor() {
    effect(() => {
      const v = this.vehicle();
      if (v && this.isOpen()) {
        this.actionError.set(null);
        let dateVal = '';
        if (v.crlvExpiration) {
          const d = new Date(v.crlvExpiration);
          if (!isNaN(d.getTime())) {
            dateVal = d.toISOString().split('T')[0];
          }
        }
        this.updateCrlvForm.reset({ crlvExpiration: dateVal });
      }
    });
  }

  onClose(): void {
    this.close.emit();
    this.actionError.set(null);
  }

  confirmUpdateCrlv(): void {
    const v = this.vehicle();
    if (!v) return;

    if (this.updateCrlvForm.invalid) {
      this.updateCrlvForm.markAllAsTouched();
      this.toastService.error('Informe uma data de vencimento válida.');
      return;
    }

    const newDate = this.updateCrlvForm.value.crlvExpiration;
    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.updateCrlv(v.id, newDate).subscribe({
      next: (updatedVehicle) => {
        this.isActionLoading.set(false);
        this.toastService.success(`Vencimento do CRLV do veículo ${v.plate} atualizado com sucesso!`);
        this.crlvUpdated.emit(updatedVehicle);
        this.onClose();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível atualizar a data do CRLV.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }
}
