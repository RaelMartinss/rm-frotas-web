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
      <div header-icon class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20 shadow-2xs">
        <svg lucideFileText class="size-4"></svg>
      </div>

      <form [formGroup]="updateCrlvForm" (ngSubmit)="confirmUpdateCrlv()" class="p-6 space-y-4">
        @if (actionError()) {
          <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
            <span>{{ actionError() }}</span>
          </div>
        }

        <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] space-y-1.5 text-xs">
          <div class="text-[#8E9DA8] text-[11px]">Veículo selecionado:</div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-white">{{ vehicle()?.brand }} {{ vehicle()?.model }}</span>
            <span class="font-mono font-bold text-xs bg-[#0F1215] text-white px-2 py-0.5 rounded-md border border-[#222A2F]">
              {{ vehicle()?.plate }}
            </span>
          </div>
          <div class="flex items-center justify-between text-[#8E9DA8] pt-1 border-t border-[#222A2F]">
            <span>Vencimento Atual:</span>
            <span class="font-medium text-xs text-white">
              {{ (vehicle()?.crlvExpiration | date:'dd/MM/yyyy') || 'Não cadastrado' }}
            </span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
            Nova Data de Vencimento do CRLV <span class="text-rose-400">*</span>
          </label>
          <input
            type="date"
            formControlName="crlvExpiration"
            class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#FF6B00] transition-all"
            [ngClass]="(updateCrlvForm.get('crlvExpiration')?.invalid && updateCrlvForm.get('crlvExpiration')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
          />
          @if (updateCrlvForm.get('crlvExpiration')?.touched && updateCrlvForm.get('crlvExpiration')?.errors?.['required']) {
            <p class="text-[10px] text-rose-400 mt-1 font-medium">
              A nova data de vencimento é obrigatória.
            </p>
          }
        </div>

        <div class="pt-4 border-t border-[#222A2F] flex items-center justify-end gap-3">
          <button
            type="button"
            (click)="onClose()"
            [disabled]="isActionLoading()"
            class="px-4 py-2 text-xs font-semibold text-[#8E9DA8] hover:text-white hover:bg-[#171D21] border border-[#222A2F] rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="isActionLoading()"
            class="px-4 py-2 text-xs font-bold text-[#080B0C] bg-[#FF6B00] hover:bg-[#E05D00] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
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
