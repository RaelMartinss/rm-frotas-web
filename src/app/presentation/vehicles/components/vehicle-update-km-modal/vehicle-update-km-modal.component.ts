import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IVehicleRepository } from '../../../../domain/repositories/vehicle.repository.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { Vehicle } from '../../../../domain/models/vehicle.model';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import {
  LucideGauge,
  LucideLoader2,
  LucideAlertCircle
} from '@lucide/angular';

@Component({
  selector: 'app-vehicle-update-km-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalShellComponent,
    LucideGauge,
    LucideLoader2,
    LucideAlertCircle
  ],
  template: `
    <app-modal-shell
      [isOpen]="isOpen()"
      title="Atualizar Quilometragem"
      maxWidth="md"
      (close)="onClose()"
    >
      <div header-icon class="size-7 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/20 shadow-2xs">
        <svg lucideGauge class="size-4"></svg>
      </div>

      <form [formGroup]="updateKmForm" (ngSubmit)="confirmUpdateKm()" class="p-6 space-y-4">
        @if (actionError()) {
          <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <svg lucideAlertCircle class="size-4 text-rose-400 shrink-0"></svg>
            <span>{{ actionError() }}</span>
          </div>
        }

        <div class="p-3.5 bg-[#11161A] rounded-xl border border-[#222A2F] space-y-1.5 text-xs">
          <div class="text-[#8E9DA8] text-[11px]">Veículo selecionado:</div>
          <div class="font-bold text-white">{{ vehicle()?.brand }} {{ vehicle()?.model }} ({{ vehicle()?.plate }})</div>
          <div class="flex items-center justify-between text-[#8E9DA8] pt-1 border-t border-[#222A2F]">
            <span>KM Atual no Odômetro:</span>
            <span class="font-mono font-bold text-white text-sm">{{ vehicle()?.currentKm | number }} km</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#8E9DA8] mb-1">
            Nova Quilometragem Acumulada <span class="text-rose-400">*</span>
          </label>
          <input
            type="number"
            formControlName="currentKm"
            placeholder="Ex: 50000"
            class="w-full bg-[#11161A] border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-[#FF6B00] transition-all placeholder:font-sans placeholder:text-[#62707C]"
            [ngClass]="(updateKmForm.get('currentKm')?.invalid && updateKmForm.get('currentKm')?.touched) ? 'border-rose-500 bg-rose-950/20' : 'border-[#222A2F]'"
          />
          @if (updateKmForm.get('currentKm')?.touched && updateKmForm.get('currentKm')?.errors?.['min']) {
            <p class="text-[10px] text-rose-400 mt-1 font-medium">
              A nova quilometragem não pode ser menor que a atual ({{ vehicle()?.currentKm | number }} km).
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
            Atualizar KM
          </button>
        </div>
      </form>
    </app-modal-shell>
  `
})
export class VehicleUpdateKmModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vehicleRepository = inject(IVehicleRepository);
  private readonly toastService = inject(ToastService);

  isOpen = input<boolean>(false);
  vehicle = input<Vehicle | null>(null);

  close = output<void>();
  kmUpdated = output<number>();

  isActionLoading = signal<boolean>(false);
  actionError = signal<string | null>(null);

  updateKmForm: FormGroup = this.fb.group({
    currentKm: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    effect(() => {
      const v = this.vehicle();
      if (v && this.isOpen()) {
        const current = v.currentKm ?? 0;
        this.actionError.set(null);
        this.updateKmForm.reset({ currentKm: current });
        this.updateKmForm.get('currentKm')?.setValidators([Validators.required, Validators.min(current)]);
        this.updateKmForm.get('currentKm')?.updateValueAndValidity();
      }
    });
  }

  onClose(): void {
    this.close.emit();
    this.actionError.set(null);
  }

  confirmUpdateKm(): void {
    const v = this.vehicle();
    if (!v) return;

    if (this.updateKmForm.invalid) {
      this.updateKmForm.markAllAsTouched();
      this.toastService.error('Informe um valor de quilometragem válido maior ou igual ao atual.');
      return;
    }

    const newKm = Number(this.updateKmForm.value.currentKm);
    this.isActionLoading.set(true);
    this.actionError.set(null);

    this.vehicleRepository.updateKm(v.id, newKm).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.toastService.success(`Quilometragem do veículo ${v.plate} atualizada para ${newKm} km!`);
        this.kmUpdated.emit(newKm);
        this.onClose();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        const msg = err.error?.message || 'Não foi possível atualizar a quilometragem.';
        this.actionError.set(msg);
        this.toastService.error(msg);
      }
    });
  }
}
